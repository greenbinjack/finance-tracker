import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { LoanPaymentForm } from "@/components/loan-payment-form";
import { getLoan } from "@/lib/services/loans";
import { getProfile } from "@/lib/services/profile";
import { computeLoanStatus, remainingBalance, computeAccruedInterest } from "@/lib/domain/loan";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { addLoanPaymentAction, deleteLoanAction } from "../actions";

const STATUS_LABELS = { open: "Open", partly_paid: "Partly paid", settled: "Settled" } as const;

export default async function LoanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [loan, profile] = await Promise.all([getLoan(id).catch(() => null), getProfile()]);

  if (!loan) notFound();

  const currency = profile?.currency ?? "BDT";
  const payments = [...loan.loan_payments].sort((a, b) => b.paid_on.localeCompare(a.paid_on));
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const remaining = remainingBalance(Number(loan.principal_amount), totalPaid);
  const status = computeLoanStatus(Number(loan.principal_amount), totalPaid);
  const progressPercent = Math.min(100, (totalPaid / Number(loan.principal_amount)) * 100);
  const today = new Date().toISOString().slice(0, 10);
  const accruedInterest = computeAccruedInterest(
    Number(loan.principal_amount),
    loan.interest_rate === null ? null : Number(loan.interest_rate),
    loan.date_of_loan,
    today,
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          nativeButton={false}
          render={
            <Link href="/loans">
              <ChevronLeft className="h-5 w-5" />
            </Link>
          }
        />
        <h1 className="text-lg font-semibold">{loan.person_name}</h1>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 pt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {loan.direction === "given" ? "You lent" : "You borrowed"}
            </p>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-medium",
                status === "settled" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                status === "partly_paid" && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                status === "open" && "bg-muted text-muted-foreground",
              )}
            >
              {STATUS_LABELS[status]}
            </span>
          </div>

          <p className="text-3xl font-semibold tabular-nums">{formatCurrency(remaining, currency)}</p>
          <p className="text-xs text-muted-foreground">
            remaining of {formatCurrency(Number(loan.principal_amount), currency)}
            {loan.due_date && ` · due ${formatDate(loan.due_date)}`}
          </p>

          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {loan.interest_rate !== null && Number(loan.interest_rate) > 0 && (
            <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
              <span className="text-muted-foreground">
                Interest accrued ({Number(loan.interest_rate)}%/yr, since {formatDate(loan.date_of_loan)})
              </span>
              <span className="font-medium tabular-nums">{formatCurrency(accruedInterest, currency)}</span>
            </div>
          )}

          {loan.notes && <p className="text-sm text-muted-foreground">{loan.notes}</p>}
        </CardContent>
      </Card>

      {status !== "settled" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Log a payment</CardTitle>
          </CardHeader>
          <CardContent>
            <LoanPaymentForm onSubmit={addLoanPaymentAction.bind(null, id)} />
          </CardContent>
        </Card>
      )}

      {payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment history</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{formatDate(p.paid_on)}</span>
                <span className="font-medium tabular-nums">{formatCurrency(Number(p.amount), currency)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        title="Delete this loan?"
        description="This removes its payment history too. This can't be undone."
        onConfirm={deleteLoanAction.bind(null, id)}
        errorMessage="Couldn't delete this loan. Please try again."
        trigger={
          <Button
            type="button"
            variant="destructive"
            nativeButton={false}
            className="w-full"
            render={
              <span>
                <Trash2 className="h-4 w-4" />
                Delete loan
              </span>
            }
          />
        }
      />
    </div>
  );
}
