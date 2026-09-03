"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function redirectWithError(message: string): never {
  redirect(`/login?error=${encodeURIComponent(message)}`);
}

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) redirectWithError(error.message);
  redirect("/");
}

export async function signUp(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  if (password.length < 6) redirectWithError("Password must be at least 6 characters");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) redirectWithError(error.message);

  // Default categories and a starter account are seeded on first authenticated
  // page load (see ensureDefaultsSeeded in the (app) layout), not here — so it
  // can't be silently skipped by an error in this action.
  if (data.session) redirect("/");

  redirect("/login?message=" + encodeURIComponent("Check your email to confirm your account"));
}
