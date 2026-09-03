import { createClient } from "@/lib/supabase/server";
import type { ScheduledItemInput } from "@/lib/validation/split";
import { canReduceScheduledAmount, canChangeScheduledType } from "@/lib/domain/event";

export async function createScheduledItem(eventId: string, input: ScheduledItemInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("event_scheduled_items")
    .insert({ ...input, event_id: eventId, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/** Sum of transactions already recorded against a scheduled item — the floor its amount can never drop below. */
async function getFulfilledAmount(id: string): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("transactions").select("amount").eq("scheduled_item_id", id);
  if (error) throw error;
  return data.reduce((sum, tx) => sum + Number(tx.amount), 0);
}

export async function updateScheduledItem(id: string, input: ScheduledItemInput) {
  const supabase = await createClient();
  const [{ data: current, error: currentError }, fulfilled] = await Promise.all([
    supabase.from("event_scheduled_items").select("type").eq("id", id).single(),
    getFulfilledAmount(id),
  ]);
  if (currentError) throw currentError;

  if (!canReduceScheduledAmount(input.amount, fulfilled)) {
    throw new Error(
      `Can't set this below ${fulfilled} — that much has already been recorded against it.`,
    );
  }
  if (current.type !== input.type && !canChangeScheduledType(fulfilled)) {
    throw new Error(
      `Can't change the type — ${fulfilled} has already been recorded against this as ${current.type}.`,
    );
  }

  const { data, error } = await supabase
    .from("event_scheduled_items")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteScheduledItem(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("event_scheduled_items").delete().eq("id", id);
  if (error) throw error;
}
