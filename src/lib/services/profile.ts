import { createClient } from "@/lib/supabase/server";

// No explicit auth.getUser() + .eq("id", user.id) here — RLS ("auth.uid() = id")
// already restricts these queries to exactly the caller's own row, so adding
// that filter would just be a second, redundant Auth API round-trip for the
// same restriction Postgres already enforces.
export async function getProfile() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").select("*").maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateCurrency(currency: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ currency });
  if (error) throw error;
}

/**
 * Permanently deletes the caller's account and every row of their data —
 * every table cascades from auth.users(id) on delete, so this one RPC call
 * (see delete_own_account in schema.sql) is the whole deletion. Irreversible.
 */
export async function deleteOwnAccount() {
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_own_account");
  if (error) throw error;
}
