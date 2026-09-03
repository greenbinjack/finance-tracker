import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Ensures a signed-in user has their default categories and a starter account.
 * Defensive against signUp's seeding step having failed (e.g. a transient
 * permissions issue). Takes an already-created client rather than making its
 * own — called from middleware (which has its own request-scoped client;
 * `next/headers`'s cookies() used by the Server Component client isn't
 * available there) as well as, potentially, Server Component contexts.
 */
export async function ensureDefaultsSeeded(supabase: SupabaseClient<Database>, userId: string) {
  const [
    { count: categoryCount, error: categoryCountError },
    { count: accountCount, error: accountCountError },
  ] = await Promise.all([
    supabase.from("categories").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("accounts").select("id", { count: "exact", head: true }).eq("user_id", userId),
  ]);
  if (categoryCountError) throw categoryCountError;
  if (accountCountError) throw accountCountError;

  await Promise.all([
    categoryCount
      ? Promise.resolve()
      : supabase.rpc("seed_default_categories", { p_user_id: userId }).then(({ error }) => {
          if (error) throw error;
        }),
    accountCount
      ? Promise.resolve()
      : supabase
          .from("accounts")
          .upsert({ name: "Cash", user_id: userId }, { onConflict: "user_id,name", ignoreDuplicates: true })
          .then(({ error }) => {
            if (error) throw error;
          }),
  ]);
}
