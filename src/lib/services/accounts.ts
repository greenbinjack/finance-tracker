import { createClient } from "@/lib/supabase/server";
import { computeAccountBalances } from "@/lib/domain/accounts";
import { decryptField, encryptOptionalField } from "@/lib/crypto/field-encryption";
import type { AccountInput, TransferInput } from "@/lib/validation/account";

function decryptAccountFields<T extends { account_number: string | null; card_number: string | null }>(
  account: T,
): T {
  return {
    ...account,
    account_number: decryptField(account.account_number),
    card_number: decryptField(account.card_number),
  };
}

export async function listAccounts() {
  const supabase = await createClient();
  // Ordered in JS, not via .order("sort_order", ...) — sort_order defaults
  // to 0 for every row (see schema.sql), so this is a stable no-op until the
  // user actually reorders accounts, and it's resilient to querying before
  // that column's migration has been run against a given Supabase project.
  const { data, error } = await supabase.from("accounts").select("*").order("name");
  if (error) throw error;
  return data
    .map(decryptAccountFields)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
}

export async function createAccount(input: AccountInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("accounts")
    .insert({
      ...input,
      account_number: encryptOptionalField(input.account_number),
      card_number: encryptOptionalField(input.card_number),
      user_id: user.id,
    })
    .select()
    .single();

  if (error) throw error;
  return decryptAccountFields(data);
}

export async function updateAccount(id: string, input: AccountInput) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("accounts")
    .update({
      ...input,
      account_number: encryptOptionalField(input.account_number),
      card_number: encryptOptionalField(input.card_number),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return decryptAccountFields(data);
}

export async function deleteAccount(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("accounts").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Exclusive: unsets any existing primary account first, so there's never a
 * moment where two accounts are both primary at once (the schema's partial
 * unique index on `is_primary` would reject that) — a moment with zero
 * primary accounts in between is fine, since the index only restricts >1.
 */
export async function setPrimaryAccount(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error: unsetError } = await supabase
    .from("accounts")
    .update({ is_primary: false })
    .eq("user_id", user.id)
    .eq("is_primary", true);
  if (unsetError) throw unsetError;

  const { error } = await supabase.from("accounts").update({ is_primary: true }).eq("id", id);
  if (error) throw error;
}

export async function unsetPrimaryAccount(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("accounts").update({ is_primary: false }).eq("id", id);
  if (error) throw error;
}

async function reorderAccounts(orderedIds: string[]) {
  const supabase = await createClient();
  const results = await Promise.all(
    orderedIds.map((id, index) => supabase.from("accounts").update({ sort_order: index }).eq("id", id)),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;
}

/** Swaps an account with its neighbor in display order — a no-op at either end of the list. */
export async function moveAccount(id: string, direction: "up" | "down") {
  const accounts = await listAccounts();
  const index = accounts.findIndex((a) => a.id === id);
  if (index === -1) return;

  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= accounts.length) return;

  const reordered = [...accounts];
  [reordered[index], reordered[swapWith]] = [reordered[swapWith], reordered[index]];
  await reorderAccounts(reordered.map((a) => a.id));
}

export type { AccountBalance } from "@/lib/domain/accounts";

/**
 * All-time running balance per account (income minus expense, transfers
 * moved between two), plus a total across accounts. This is "how much money
 * do I actually have", distinct from the dashboard's monthly income/expense
 * summary.
 */
export async function getAccountBalances() {
  const supabase = await createClient();
  const [{ data: accounts, error: accountsError }, { data: transactions, error: txError }] =
    await Promise.all([
      supabase.from("accounts").select("id, name, opening_balance").order("name"),
      supabase
        .from("transactions")
        .select("account_id, to_account_id, type, amount")
        .eq("in_personal_history", true),
    ]);
  if (accountsError) throw accountsError;
  if (txError) throw txError;

  return computeAccountBalances(
    accounts.map((a) => ({ id: a.id, name: a.name, openingBalance: Number(a.opening_balance) })),
    transactions.map((tx) => ({
      accountId: tx.account_id,
      toAccountId: tx.to_account_id,
      type: tx.type,
      amount: Number(tx.amount),
    })),
  );
}

/**
 * Moves money from one of the user's own accounts to another — a single
 * transaction row (type "transfer") rather than a paired expense+income, so
 * it reads as one line in history and is trivially excluded from income/
 * expense reporting by its type alone.
 */
export async function createTransfer(input: TransferInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("transactions")
    .insert({
      type: "transfer",
      account_id: input.from_account_id,
      to_account_id: input.to_account_id,
      amount: input.amount,
      occurred_on: input.occurred_on,
      note: input.note,
      user_id: user.id,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
