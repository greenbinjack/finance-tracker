import { createClient } from "@/lib/supabase/server";
import { computeAccountBalances } from "@/lib/domain/accounts";
import type { AccountInput, TransferInput } from "@/lib/validation/account";

export async function listAccounts() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("accounts").select("*").order("name");
  if (error) throw error;
  return data;
}

export async function createAccount(input: AccountInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("accounts")
    .insert({ ...input, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateAccount(id: string, input: AccountInput) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("accounts")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteAccount(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("accounts").delete().eq("id", id);
  if (error) throw error;
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
      supabase.from("accounts").select("id, name").order("name"),
      supabase
        .from("transactions")
        .select("account_id, to_account_id, type, amount")
        .eq("in_personal_history", true),
    ]);
  if (accountsError) throw accountsError;
  if (txError) throw txError;

  return computeAccountBalances(
    accounts,
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
