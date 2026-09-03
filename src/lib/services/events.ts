import { createClient } from "@/lib/supabase/server";
import type { EventInput } from "@/lib/validation/event";
import type { Database } from "@/lib/supabase/database.types";
import { computeSplitBalances, type ParticipantContributionBalance } from "@/lib/domain/split";

export async function listEvents() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .order("start_date", { ascending: false });

  if (error) throw error;
  return data;
}

export async function getEventWithSpend(id: string) {
  const supabase = await createClient();
  const [
    { data: event, error: eventError },
    { data: transactions, error: txError },
  ] = await Promise.all([
    supabase.from("events").select("*").eq("id", id).single(),
    supabase
      // accounts is hinted to the account_id FK specifically — transactions
      // now has two FKs to accounts (account_id, to_account_id), so the
      // bare, unqualified embed is ambiguous and PostgREST rejects it.
      .from("transactions")
      .select("*, categories(name, icon), accounts!transactions_account_id_fkey(name)")
      .eq("event_id", id)
      .order("occurred_on", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);
  if (eventError) throw eventError;
  if (txError) throw txError;

  const spent = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  return { event, transactions, spent };
}

interface EventDetailRpcResult {
  event: Database["public"]["Tables"]["events"]["Row"] | null;
  // Event-tagged transactions are never transfers (the transfer flow never
  // sets event_id), so this narrows the table's wider `type` column back
  // down to what actually happens here.
  transactions: (Omit<Database["public"]["Tables"]["transactions"]["Row"], "type"> & {
    type: "expense" | "income";
    categories: { name: string; icon: string | null } | null;
    accounts: { name: string } | null;
  })[];
  checklist: Database["public"]["Tables"]["event_checklist_items"]["Row"][];
  participants: Database["public"]["Tables"]["event_participants"]["Row"][];
  settlements: Database["public"]["Tables"]["participant_settlements"]["Row"][];
  scheduled_items: Database["public"]["Tables"]["event_scheduled_items"]["Row"][];
  itinerary: Database["public"]["Tables"]["event_itinerary_items"]["Row"][];
  transaction_splits: Database["public"]["Tables"]["transaction_splits"]["Row"][];
  categories: Database["public"]["Tables"]["categories"]["Row"][];
  accounts: Database["public"]["Tables"]["accounts"]["Row"][];
  profile: Database["public"]["Tables"]["profiles"]["Row"] | null;
}

export interface EventDetailScheduledItem {
  id: string;
  type: "expense" | "income";
  amount: number;
  note: string | null;
  fulfilled: number;
  remaining: number;
}

/**
 * Everything the event detail page needs, fetched in a single round-trip via
 * the get_event_detail Postgres function instead of ~10 separate concurrent
 * queries (participants, transactions, settlements, checklist, scheduled
 * items + their fulfillments, categories, accounts, profile). Bursting that
 * many requests at once was intermittently stalling for 10+ seconds — almost
 * certainly connection-pool contention on Supabase's side — which made edits
 * and deletes feel slow, or occasionally look like they hadn't updated at all.
 */
export async function getEventDetail(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_event_detail", { p_event_id: id });
  if (error) throw error;

  const result = data as unknown as EventDetailRpcResult;
  if (!result.event) return null;

  const spent = result.transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const splitsByTransaction = new Map<string, { participant_id: string | null; amount: number }[]>();
  // Defensive: falls back to [] if the live get_event_detail RPC hasn't been
  // updated with the new `transaction_splits` key yet (the app's schema.sql
  // outruns what's actually applied to the database until it's re-run there).
  for (const s of result.transaction_splits ?? []) {
    const list = splitsByTransaction.get(s.transaction_id) ?? [];
    list.push({ participant_id: s.participant_id, amount: Number(s.share_amount) });
    splitsByTransaction.set(s.transaction_id, list);
  }

  const participantIds = [null, ...result.participants.map((p) => p.id)];
  const { average, balances } = computeSplitBalances(
    participantIds,
    result.transactions
      .filter((t) => !t.is_external)
      .map((t) => ({
        participantId: t.paid_by_participant_id,
        amount: Number(t.amount),
        splits: splitsByTransaction.get(t.id)?.map((s) => ({ participantId: s.participant_id, amount: s.amount })),
      })),
    result.settlements.map((s) => ({
      fromParticipantId: s.from_participant_id,
      toParticipantId: s.to_participant_id,
      amount: Number(s.amount),
    })),
  );

  const fulfilledByItem = new Map<string, number>();
  for (const t of result.transactions) {
    if (!t.scheduled_item_id) continue;
    fulfilledByItem.set(t.scheduled_item_id, (fulfilledByItem.get(t.scheduled_item_id) ?? 0) + Number(t.amount));
  }
  const scheduledItems: EventDetailScheduledItem[] = result.scheduled_items.map((item) => {
    const amount = Number(item.amount);
    const fulfilled = Math.min(fulfilledByItem.get(item.id) ?? 0, amount);
    return { id: item.id, type: item.type, amount, note: item.note, fulfilled, remaining: amount - fulfilled };
  });

  return {
    event: result.event,
    transactions: result.transactions.map((t) => ({
      ...t,
      splits: splitsByTransaction.get(t.id) ?? [],
    })),
    spent,
    checklist: result.checklist,
    participants: result.participants.map((p) => ({ id: p.id, name: p.name })),
    average,
    balances: balances as ParticipantContributionBalance[],
    scheduledItems,
    // Defensive: falls back to [] if the live get_event_detail RPC hasn't
    // been updated with the new `itinerary` key yet.
    itinerary: result.itinerary ?? [],
    categories: result.categories,
    accounts: result.accounts,
    profile: result.profile,
  };
}

export async function createEvent(input: EventInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("events")
    .insert({ ...input, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateEvent(id: string, input: Partial<EventInput>) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteEvent(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) throw error;
}

export async function createChecklistItem(eventId: string, text: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("event_checklist_items")
    .insert({ event_id: eventId, user_id: user.id, text })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function toggleChecklistItem(id: string, isDone: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("event_checklist_items")
    .update({ is_done: isDone })
    .eq("id", id);

  if (error) throw error;
}

export async function deleteChecklistItem(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("event_checklist_items").delete().eq("id", id);
  if (error) throw error;
}

/** Total spend per event, for showing budget-vs-spent on the events list without N+1 detail fetches. */
export async function listEventsWithSpend() {
  const supabase = await createClient();
  const [{ data: events, error: eventsError }, { data: transactions, error: txError }] =
    await Promise.all([
      supabase.from("events").select("*").order("start_date", { ascending: false }),
      supabase.from("transactions").select("event_id, type, amount").not("event_id", "is", null),
    ]);

  if (eventsError) throw eventsError;
  if (txError) throw txError;

  const spendByEvent = new Map<string, number>();
  for (const tx of transactions) {
    if (tx.type !== "expense" || !tx.event_id) continue;
    spendByEvent.set(tx.event_id, (spendByEvent.get(tx.event_id) ?? 0) + Number(tx.amount));
  }

  return events.map((event) => ({ ...event, spent: spendByEvent.get(event.id) ?? 0 }));
}
