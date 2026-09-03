"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { updateCurrency, deleteOwnAccount } from "@/lib/services/profile";
import { enrollTotp, verifyMfaEnrollment, listVerifiedTotpFactors, unenrollMfaFactor } from "@/lib/services/mfa";
import { createClient } from "@/lib/supabase/server";
import {
  createCategory,
  renameCategory,
  deleteCategory,
} from "@/lib/services/categories";
import {
  createAccount,
  updateAccount,
  deleteAccount,
  createTransfer,
  setPrimaryAccount,
  unsetPrimaryAccount,
  moveAccount,
} from "@/lib/services/accounts";
import { verifyPassword, signOutOtherSessions } from "@/lib/services/auth";
import { accountSchema, transferSchema, type AccountInput, type TransferInput } from "@/lib/validation/account";
import type { TransactionType } from "@/lib/supabase/database.types";

function revalidateSettingsSurfaces() {
  revalidatePath("/settings");
  revalidatePath("/");
  revalidatePath("/transactions");
}

export async function updateCurrencyAction(currency: string) {
  await updateCurrency(currency);
  revalidateSettingsSurfaces();
}

export async function createSettingsCategoryAction(name: string, type: TransactionType) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Category name is required");
  await createCategory(trimmed, type);
  revalidateSettingsSurfaces();
}

export async function renameCategoryAction(id: string, name: string) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Category name is required");
  await renameCategory(id, trimmed);
  revalidateSettingsSurfaces();
}

export async function deleteCategoryAction(id: string) {
  await deleteCategory(id);
  revalidateSettingsSurfaces();
}

export async function createSettingsAccountAction(input: AccountInput) {
  const parsed = accountSchema.parse(input);
  await createAccount(parsed);
  revalidateSettingsSurfaces();
}

export async function updateSettingsAccountAction(id: string, input: AccountInput) {
  const parsed = accountSchema.parse(input);
  await updateAccount(id, parsed);
  revalidateSettingsSurfaces();
}

export async function deleteAccountAction(id: string) {
  await deleteAccount(id);
  revalidateSettingsSurfaces();
}

export async function setPrimaryAccountAction(id: string) {
  await setPrimaryAccount(id);
  revalidateSettingsSurfaces();
}

export async function unsetPrimaryAccountAction(id: string) {
  await unsetPrimaryAccount(id);
  revalidateSettingsSurfaces();
}

export async function moveAccountAction(id: string, direction: "up" | "down") {
  await moveAccount(id, direction);
  revalidateSettingsSurfaces();
}

/** Used to gate revealing a masked card/account number, and before a transfer — see verifyPassword. */
export async function verifyPasswordAction(password: string): Promise<boolean> {
  return verifyPassword(password);
}

export async function createTransferAction(input: TransferInput) {
  const parsed = transferSchema.parse(input);

  const passwordOk = await verifyPassword(parsed.password);
  if (!passwordOk) throw new Error("Incorrect password");

  await createTransfer(parsed);
  revalidateSettingsSurfaces();
}

/** Permanently deletes the user's whole account after re-checking the password — same trust boundary as a transfer, but irreversible, so it's checked here rather than left to the client. */
export async function deleteUserAccountAction(password: string) {
  const passwordOk = await verifyPassword(password);
  if (!passwordOk) throw new Error("Incorrect password");

  await deleteOwnAccount();

  const supabase = await createClient();
  try {
    await supabase.auth.signOut();
  } catch {
    // The account row (and with it, the session) may already be gone by the
    // time this runs — the redirect below still gets the user to a clean,
    // logged-out state either way.
  }

  redirect("/login?message=" + encodeURIComponent("Your account has been deleted."));
}

export async function signOutOtherSessionsAction() {
  await signOutOtherSessions();
}

export async function enrollTotpAction() {
  return enrollTotp();
}

export async function verifyMfaEnrollmentAction(factorId: string, code: string) {
  await verifyMfaEnrollment(factorId, code);
  revalidatePath("/settings");
}

export async function listMfaFactorsAction() {
  return listVerifiedTotpFactors();
}

/**
 * No password re-check here, unlike the rest of this file's sensitive
 * actions: unenrolling a verified TOTP factor requires the session to
 * already be at AAL2 (Supabase rejects it otherwise), which only happens by
 * passing the /mfa-challenge gate — proof of both password and TOTP already
 * stronger than a password re-check alone. Re-verifying via
 * signInWithPassword here would actually break this: a fresh password-only
 * sign-in only ever reaches AAL1, silently downgrading the session and
 * making the very next unenroll call fail.
 */
export async function unenrollMfaFactorAction(factorId: string) {
  await unenrollMfaFactor(factorId);
  revalidatePath("/settings");
}
