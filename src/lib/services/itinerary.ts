import { createClient } from "@/lib/supabase/server";
import type { ItineraryItemInput } from "@/lib/validation/itinerary";

export async function listItineraryItems(eventId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_itinerary_items")
    .select("*")
    .eq("event_id", eventId)
    .order("day_date", { ascending: true })
    .order("time", { ascending: true, nullsFirst: false });

  if (error) throw error;
  return data;
}

export async function createItineraryItem(eventId: string, input: ItineraryItemInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("event_itinerary_items")
    .insert({ ...input, event_id: eventId, user_id: user.id });
  if (error) throw error;
}

export async function updateItineraryItem(id: string, input: ItineraryItemInput) {
  const supabase = await createClient();
  const { error } = await supabase.from("event_itinerary_items").update(input).eq("id", id);
  if (error) throw error;
}

export async function deleteItineraryItem(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("event_itinerary_items").delete().eq("id", id);
  if (error) throw error;
}

/** Turns the public trip-share link on (generating a fresh unguessable token) or off (clearing it, which immediately invalidates any link already handed out). */
export async function setEventSharing(eventId: string, enabled: boolean): Promise<string | null> {
  const supabase = await createClient();
  const token = enabled ? crypto.randomUUID() : null;
  const { error } = await supabase.from("events").update({ share_token: token }).eq("id", eventId);
  if (error) throw error;
  return token;
}

export interface SharedTripData {
  event: { name: string; start_date: string | null; end_date: string | null; notes: string | null } | null;
  itinerary: {
    id: string;
    day_date: string;
    time: string | null;
    title: string;
    notes: string | null;
    location: string | null;
  }[];
  checklist: { text: string; is_done: boolean }[];
  participants: { name: string }[];
}

/** Public, unauthenticated read of a shared trip — returns event: null for an invalid/revoked token. Deliberately carries no money data. */
export async function getSharedTrip(token: string): Promise<SharedTripData> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_shared_trip", { p_token: token });
  if (error) throw error;
  return data as unknown as SharedTripData;
}
