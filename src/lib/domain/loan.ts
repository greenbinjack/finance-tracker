import type { LoanStatus } from "@/lib/supabase/database.types";

export function computeLoanStatus(principalAmount: number, totalPaid: number): LoanStatus {
  if (totalPaid <= 0) return "open";
  if (totalPaid >= principalAmount) return "settled";
  return "partly_paid";
}

export function remainingBalance(principalAmount: number, totalPaid: number): number {
  return Math.max(0, principalAmount - totalPaid);
}

/**
 * Simple interest accrued from the loan date to `asOfDate`, at an annual
 * percentage rate (e.g. 5.5 for 5.5%/yr) — not compound, a reasonable default
 * for informal person-to-person loans. UTC date math throughout (not local
 * `Date` parsing) so it isn't off by a day across DST boundaries.
 */
export function computeAccruedInterest(
  principalAmount: number,
  annualRatePercent: number | null,
  dateOfLoan: string,
  asOfDate: string,
): number {
  if (!annualRatePercent || annualRatePercent <= 0) return 0;

  const start = new Date(dateOfLoan + "T00:00:00Z");
  const end = new Date(asOfDate + "T00:00:00Z");
  const daysElapsed = Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const years = daysElapsed / 365;

  return principalAmount * (annualRatePercent / 100) * years;
}

export type LoanUrgency = "overdue" | "due_soon" | "none";

/** A settled loan is never urgent regardless of its due date. "Due soon" is within the next 7 days (inclusive of today). */
export function computeLoanUrgency(
  dueDate: string | null,
  status: LoanStatus,
  today: string,
  dueSoonWindowDays = 7,
): LoanUrgency {
  if (!dueDate || status === "settled") return "none";
  if (dueDate < today) return "overdue";

  const due = new Date(dueDate + "T00:00:00");
  const from = new Date(today + "T00:00:00");
  const daysUntilDue = Math.round((due.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
  return daysUntilDue <= dueSoonWindowDays ? "due_soon" : "none";
}
