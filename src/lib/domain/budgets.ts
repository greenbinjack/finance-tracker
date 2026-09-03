export interface BudgetStatus {
  spent: number;
  cap: number | null;
  remaining: number | null;
  percentUsed: number | null;
  isOverBudget: boolean;
}

/** Spend vs. a monthly category cap. Percent and remaining are null when no cap was set. */
export function computeBudgetStatus(spent: number, cap: number | null): BudgetStatus {
  if (cap === null || cap === 0) {
    return { spent, cap, remaining: null, percentUsed: null, isOverBudget: false };
  }
  return {
    spent,
    cap,
    remaining: cap - spent,
    percentUsed: (spent / cap) * 100,
    isOverBudget: spent > cap,
  };
}
