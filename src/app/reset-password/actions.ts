"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function redirectWithError(message: string): never {
  redirect(`/reset-password?error=${encodeURIComponent(message)}`);
}

export async function resetPassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");

  if (password.length < 8) redirectWithError("Password must be at least 8 characters");
  if (password !== confirmPassword) redirectWithError("Passwords don't match");

  const supabase = await createClient();
  // Relies on the temporary recovery session set up by /auth/callback after
  // the user clicked their emailed reset link — no separate identity check
  // needed here, updateUser acts on whichever session is on the request.
  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirectWithError(error.message);

  redirect("/");
}
