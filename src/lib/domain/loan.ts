import type { LoanStatus } from "@/lib/supabase/database.types";

export function computeLoanStatus(principalAmount: number, totalPaid: number): LoanStatus {
  if (totalPaid <= 0) return "open";
  if (totalPaid >= principalAmount) return "settled";
  return "partly_paid";
}

export function remainingBalance(principalAmount: number, totalPaid: number): number {
  return Math.max(0, principalAmount - totalPaid);
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
