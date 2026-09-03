export type CountdownStatus = "upcoming" | "in_progress" | "past";

export interface Countdown {
  status: CountdownStatus;
  /** Days until start_date (upcoming), or days since end_date/start_date (past) — always a non-negative count. */
  days: number;
}

/**
 * Days until a trip starts, or whether it's currently happening / already
 * over — UTC date math (not local `Date` parsing) so it isn't off by a day
 * across DST boundaries. Returns null when there's no start_date to count
 * from at all.
 */
export function computeCountdown(startDate: string | null, endDate: string | null, today: string): Countdown | null {
  if (!startDate) return null;

  const start = new Date(startDate + "T00:00:00Z");
  const end = new Date((endDate ?? startDate) + "T00:00:00Z");
  const now = new Date(today + "T00:00:00Z");
  const dayMs = 1000 * 60 * 60 * 24;

  if (now < start) {
    return { status: "upcoming", days: Math.round((start.getTime() - now.getTime()) / dayMs) };
  }
  if (now <= end) {
    return { status: "in_progress", days: 0 };
  }
  return { status: "past", days: Math.round((now.getTime() - end.getTime()) / dayMs) };
}

/** A short display label for a countdown, or null when the trip is already over (nothing to show). */
export function formatCountdown(countdown: Countdown | null): string | null {
  if (!countdown) return null;
  if (countdown.status === "in_progress") return "Happening now";
  if (countdown.status === "past") return null;
  if (countdown.days === 0) return "Starts today";
  if (countdown.days === 1) return "1 day to go";
  return `${countdown.days} days to go`;
}

export interface EventBudgetStatus {
  spent: number;
  budget: number | null;
  remaining: number | null;
  percentUsed: number | null;
  isOverBudget: boolean;
}

/** Budget vs. spend for an event/trip. Percent and remaining are null when no budget was set. */
export function computeEventBudgetStatus(spent: number, budget: number | null): EventBudgetStatus {
  if (budget === null || budget === 0) {
    return { spent, budget, remaining: null, percentUsed: null, isOverBudget: false };
  }
  const remaining = budget - spent;
  return {
    spent,
    budget,
    remaining,
    percentUsed: (spent / budget) * 100,
    isOverBudget: spent > budget,
  };
}

/**
 * A scheduled item's planned amount can never drop below what's already
 * been fulfilled against it (real transactions linked to it) — otherwise
 * "remaining" would go negative, which is meaningless for a plan that's
 * already been more than fulfilled at that new, lower amount.
 */
export function canReduceScheduledAmount(newAmount: number, fulfilledSoFar: number): boolean {
  return newAmount >= fulfilledSoFar;
}

/**
 * A scheduled item's type (expense vs. income) can't change once it has any
 * fulfillment — those linked transactions already recorded their own type,
 * so flipping the plan's type afterward would leave it describing something
 * different from what was actually paid/received against it.
 */
export function canChangeScheduledType(fulfilledSoFar: number): boolean {
  return fulfilledSoFar === 0;
}

/**
 * A trip transaction should count toward the user's own real transaction
 * history/dashboard only when it's genuinely the user's own money: given by
 * "Myself" (paidByParticipantId null) AND not external funding. Given by a
 * participant, or external, means the money never actually came out of (or
 * into) the user's own pocket.
 */
export function isOwnMoney(paidByParticipantId: string | null, isExternal: boolean): boolean {
  return paidByParticipantId === null && !isExternal;
}

/**
 * "Total journey money" = every real transaction tagged to the trip so far
 * (any type, any giver — Myself, a participant, or external funding all
 * count here) plus what's still planned but not yet realized. Deliberately
 * takes the raw transaction list rather than the balance table's per-
 * participant totals: the balance table excludes external contributions
 * (they're not part of anyone's split), but this total must still include
 * them — otherwise "total journey money" could read lower than "already
 * expended", which makes no sense. Uses each scheduled item's `remaining`
 * rather than its full planned amount — once a plan is (partially)
 * fulfilled, that portion is already counted via its linked transaction, so
 * adding the full planned amount too would double-count it.
 */
export function computeTotalJourneyMoney(
  transactions: { amount: number }[],
  scheduledItems: { remaining: number }[],
): number {
  const totalActualGiven = transactions.reduce((sum, t) => sum + t.amount, 0);
  const totalScheduledRemaining = scheduledItems.reduce((sum, item) => sum + item.remaining, 0);
  return totalActualGiven + totalScheduledRemaining;
}
