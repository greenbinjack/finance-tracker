import { createClient } from "@/lib/supabase/server";
import type { SettlementInput, EventExpenseInput } from "@/lib/validation/split";
import { isOwnMoney } from "@/lib/domain/event";
import { createTransaction } from "@/lib/services/transactions";

export async function listParticipants(eventId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_participants")
    .select("*")
    .eq("event_id", eventId)
    .order("name");

  if (error) throw error;
  return data;
}

export async function createParticipant(eventId: string, name: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("event_participants")
    .insert({ event_id: eventId, name, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function renameParticipant(id: string, name: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_participants")
    .update({ name })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteParticipant(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("event_participants").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Records a trip expense or income entry naming who gave the money — a
 * participant, or null for "Myself" (the app's user). It's always tagged to
 * the event, so it always counts toward the trip's balance table below.
 * When "Myself" gave it, `in_personal_history` is automatically true — real
 * money already left/entered the user's own pocket, so it should count
 * toward their real totals too. When a participant gave it, it's excluded
 * from the user's own totals (they didn't actually spend that money) —
 * squaring that up is what settling is for.
 */
export async function createEventExpense(eventId: string, input: EventExpenseInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { splits, ...transactionInput } = input;

  const { data, error } = await supabase
    .from("transactions")
    .insert({
      ...transactionInput,
      event_id: eventId,
      user_id: user.id,
      in_personal_history: isOwnMoney(input.paid_by_participant_id, input.is_external ?? false),
    })
    .select()
    .single();
  if (error) throw error;

  if (splits && splits.length > 0) {
    try {
      await replaceTransactionSplits(data.id, user.id, splits);
    } catch (splitError) {
      // Roll back the transaction row rather than leaving an orphaned,
      // un-split expense behind that the user thinks never saved.
      await supabase.from("transactions").delete().eq("id", data.id);
      throw splitError;
    }
  }

  return data;
}

/** Updates a trip expense/income entry in place — same rules as createEventExpense for in_personal_history. */
export async function updateEventExpense(id: string, input: EventExpenseInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { splits, ...transactionInput } = input;

  const { data, error } = await supabase
    .from("transactions")
    .update({
      ...transactionInput,
      in_personal_history: isOwnMoney(input.paid_by_participant_id, input.is_external ?? false),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  // Always replace — an edit that drops back to "equal split" (empty
  // `splits`) must clear any previously-saved custom split for this expense.
  await replaceTransactionSplits(id, user.id, splits ?? []);

  return data;
}

/**
 * Swaps a transaction's custom split rows for a new set — delete-then-insert,
 * since this is a low-concurrency personal app with no need for a real
 * multi-statement transaction here. Silently no-ops when the table doesn't
 * exist yet: PostgREST reports that as its own "PGRST205" (schema cache miss)
 * rather than the raw Postgres 42P01, since it checks its schema cache before
 * issuing any SQL. The app's schema.sql can outrun what's actually applied to
 * the database, and a user who hasn't run the transaction_splits migration
 * yet should still be able to save equal-split (non-custom) expenses without
 * this failing underneath them.
 */
async function replaceTransactionSplits(
  transactionId: string,
  userId: string,
  splits: { participant_id: string | null; amount: number }[],
) {
  const supabase = await createClient();
  const { error: deleteError } = await supabase
    .from("transaction_splits")
    .delete()
    .eq("transaction_id", transactionId);
  if (deleteError) {
    // Only swallow when there's nothing to actually save — a genuine custom
    // split (splits.length > 0) must still surface the error rather than
    // silently losing what the user entered.
    const tableMissing = deleteError.code === "42P01" || deleteError.code === "PGRST205";
    if (tableMissing && splits.length === 0) return;
    throw deleteError;
  }

  if (splits.length === 0) return;

  const { error: insertError } = await supabase.from("transaction_splits").insert(
    splits.map((s) => ({
      transaction_id: transactionId,
      user_id: userId,
      participant_id: s.participant_id,
      share_amount: s.amount,
    })),
  );
  if (insertError) throw insertError;
}

/**
 * Records a direct transfer between two parties (a participant, or null for
 * "Myself" on either side) settling up a trip balance. When either side is
 * "Myself", real cash moved into or out of the user's own pocket, so a
 * linked personal transaction is created too — expense if Myself paid out,
 * income if Myself received it. It's deliberately NOT tagged to the event:
 * the trip's own total cost was already counted once when the original
 * expense was recorded, so tagging the reimbursement to the event as well
 * would count it a second time.
 */
export async function recordSettlement(
  eventId: string,
  input: SettlementInput,
  names: { from: string; to: string },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  let transactionId: string | null = null;
  if (input.from_participant_id === null || input.to_participant_id === null) {
    const meIsPaying = input.from_participant_id === null;
    const transaction = await createTransaction({
      type: meIsPaying ? "expense" : "income",
      amount: input.amount,
      occurred_on: input.settled_on,
      note: meIsPaying ? `Settlement paid to ${names.to}` : `Settlement received from ${names.from}`,
    });
    transactionId = transaction.id;
  }

  const { error } = await supabase.from("participant_settlements").insert({
    event_id: eventId,
    from_participant_id: input.from_participant_id,
    to_participant_id: input.to_participant_id,
    amount: input.amount,
    settled_on: input.settled_on,
    notes: input.notes,
    user_id: user.id,
    transaction_id: transactionId,
  });
  if (error) throw error;
}
