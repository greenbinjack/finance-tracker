import { createClient } from "@/lib/supabase/server";

export interface TotpEnrollment {
  factorId: string;
  qrCodeSvg: string;
  secret: string;
}

/**
 * Starts TOTP enrollment — the returned factor is unverified until
 * verifyMfaEnrollment succeeds. First clears out any unverified TOTP factor
 * left over from a previous abandoned attempt (closed the dialog, navigated
 * away mid-setup): Supabase rejects a second enrollment under the same
 * friendly name, so without this, retrying "Enable 2FA" would fail outright.
 */
export async function enrollTotp(): Promise<TotpEnrollment> {
  const supabase = await createClient();

  const { data: existing, error: listError } = await supabase.auth.mfa.listFactors();
  if (!listError) {
    const staleUnverified = existing.all.filter((f) => f.factor_type === "totp" && f.status === "unverified");
    for (const factor of staleUnverified) {
      await supabase.auth.mfa.unenroll({ factorId: factor.id });
    }
  }

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    issuer: "Finance Tracker",
  });
  if (error) throw error;

  return { factorId: data.id, qrCodeSvg: data.totp.qr_code, secret: data.totp.secret };
}

/** Confirms enrollment with a code from the authenticator app — the factor only becomes active on success. */
export async function verifyMfaEnrollment(factorId: string, code: string) {
  const supabase = await createClient();
  const { error: challengeError, data: challenge } = await supabase.auth.mfa.challenge({ factorId });
  if (challengeError) throw challengeError;

  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code,
  });
  if (verifyError) throw verifyError;
}

export interface MfaFactorSummary {
  id: string;
  friendlyName: string | null;
  createdAt: string;
}

/** Verified TOTP factors only — an abandoned unverified enrollment shouldn't show as "2FA enabled". */
export async function listVerifiedTotpFactors(): Promise<MfaFactorSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) throw error;

  return data.totp
    .filter((f) => f.status === "verified")
    .map((f) => ({ id: f.id, friendlyName: f.friendly_name ?? null, createdAt: f.created_at }));
}

export async function unenrollMfaFactor(factorId: string) {
  const supabase = await createClient();
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) throw error;
}
