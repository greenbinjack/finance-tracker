import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { LoanReminder } from "@/lib/services/loans";

export function LoanReminderBanner({ reminders, currency }: { reminders: LoanReminder[]; currency?: string }) {
  if (reminders.length === 0) return null;

  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardContent className="flex flex-col gap-2 p-4">
        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <p className="text-sm font-medium">Loan reminders</p>
        </div>
        <div className="flex flex-col gap-1.5">
          {reminders.map((loan) => (
            <Link
              key={loan.id}
              href={`/loans/${loan.id}`}
              className="flex items-center justify-between gap-3 text-sm hover:underline"
            >
              <span className="min-w-0 truncate">
                {loan.direction === "given" ? `${loan.person_name} owes you` : `You owe ${loan.person_name}`}
              </span>
              <span
                className={cn(
                  "shrink-0 tabular-nums",
                  loan.urgency === "overdue" ? "text-rose-600 dark:text-rose-400" : "text-amber-700 dark:text-amber-400",
                )}
              >
                {formatCurrency(loan.remaining, currency)} ·{" "}
                {loan.urgency === "overdue" ? "overdue" : formatDate(loan.due_date)}
              </span>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
