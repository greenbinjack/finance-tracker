export interface AccountBalance {
  id: string;
  name: string;
  balance: number;
}

export interface AccountTransactionInput {
  accountId: string | null;
  /** Only meaningful when type is "transfer" — the destination account. */
  toAccountId?: string | null;
  type: "expense" | "income" | "transfer";
  amount: number;
}

/**
 * All-time running balance per account (income minus expense, transfers
 * moved between two), plus whatever's tagged to no account at all, plus the
 * grand total across both. This is "how much money do I actually have" —
 * distinct from the dashboard's monthly income/expense summary. A transfer
 * always nets to zero across the total (it leaves one account and enters
 * another of the same user's), unlike expense/income which each move the
 * total.
 */
export function computeAccountBalances(
  accounts: { id: string; name: string }[],
  transactions: AccountTransactionInput[],
): { accounts: AccountBalance[]; unassigned: number; total: number } {
  const balances = new Map<string, number>();
  let unassigned = 0;

  for (const tx of transactions) {
    if (tx.type === "transfer") {
      if (tx.accountId) balances.set(tx.accountId, (balances.get(tx.accountId) ?? 0) - tx.amount);
      else unassigned -= tx.amount;

      if (tx.toAccountId) balances.set(tx.toAccountId, (balances.get(tx.toAccountId) ?? 0) + tx.amount);
      else unassigned += tx.amount;
      continue;
    }

    const delta = tx.type === "income" ? tx.amount : -tx.amount;
    if (tx.accountId) {
      balances.set(tx.accountId, (balances.get(tx.accountId) ?? 0) + delta);
    } else {
      unassigned += delta;
    }
  }

  const perAccount: AccountBalance[] = accounts.map((a) => ({
    id: a.id,
    name: a.name,
    balance: balances.get(a.id) ?? 0,
  }));

  const total = perAccount.reduce((sum, a) => sum + a.balance, 0) + unassigned;

  return { accounts: perAccount, unassigned, total };
}
