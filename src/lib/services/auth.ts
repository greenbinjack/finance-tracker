import { createClient } from "@/lib/supabase/server";

/**
 * Re-checks the signed-in user's password without changing what they're
 * signed in as — Supabase has no separate "just verify this" endpoint, so
 * this re-runs signInWithPassword with their own email, which succeeds
 * only if the password is still correct (and harmlessly refreshes the
 * existing session as a side effect).
 */
export async function verifyPassword(password: string): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return false;

  const { error } = await supabase.auth.signInWithPassword({ email: user.email, password });
  return !error;
}
