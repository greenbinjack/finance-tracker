"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function redirectWithError(message: string): never {
  redirect(`/mfa-challenge?error=${encodeURIComponent(message)}`);
}

export async function verifyMfaChallenge(formData: FormData) {
  const code = String(formData.get("code") ?? "");

  const supabase = await createClient();
  const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
  if (factorsError) redirectWithError(factorsError.message);

  const totpFactor = factors.totp.find((f) => f.status === "verified");
  if (!totpFactor) redirect("/");

  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: totpFactor.id, code });
  if (error) redirectWithError("Incorrect code — try again");

  redirect("/");
}
