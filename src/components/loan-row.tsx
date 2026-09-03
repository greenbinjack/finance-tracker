import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/format";
import { remainingBalance, computeLoanUrgency } from "@/lib/domain/loan";
import { cn } from "@/lib/utils";
import type { LoanStatus } from "@/lib/supabase/database.types";

const STATUS_STYLES: Record<LoanStatus, string> = {
  open: "bg-muted text-muted-foreground",
  partly_paid: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  settled: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
};

const STATUS_LABELS: Record<LoanStatus, string> = {
  open: "Open",
  partly_paid: "Partly paid",
  settled: "Settled",
};

export interface LoanRowData {
  id: string;
  person_name: string;
  direction: "given" | "taken";
  principal_amount: number;
  due_date: string | null;
  status: LoanStatus;
  loan_payments: { amount: number }[];
}

export function LoanRow({ loan, currency }: { loan: LoanRowData; currency?: string }) {
  const totalPaid = loan.loan_payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const remaining = remainingBalance(Number(loan.principal_amount), totalPaid);
  const urgency = computeLoanUrgency(loan.due_date, loan.status, new Date().toISOString().slice(0, 10));

  return (
    <Link
      href={`/loans/${loan.id}`}
      className="flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/60"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{loan.person_name}</p>
        <div className="flex items-center gap-1.5">
          <span className={cn("rounded-full px-1.5 py-0.5 text-xs font-medium", STATUS_STYLES[loan.status])}>
            {STATUS_LABELS[loan.status]}
          </span>
          {loan.due_date && (
            <span
              className={cn(
                "text-xs",
                urgency === "overdue"
                  ? "text-rose-600 dark:text-rose-400"
                  : urgency === "due_soon"
                    ? "text-amber-700 dark:text-amber-400"
                    : "text-muted-foreground",
              )}
            >
              {urgency === "overdue" ? "Overdue · " : ""}Due {formatDate(loan.due_date)}
            </span>
          )}
        </div>
      </div>
      <p className="shrink-0 text-sm font-semibold tabular-nums">
        {formatCurrency(remaining, currency)}
      </p>
    </Link>
  );
}
