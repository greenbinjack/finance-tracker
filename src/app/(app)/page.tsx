import Link from "next/link";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { ArrowDownLeft, ArrowUpRight, Scale, ChevronRight, Wallet, Receipt } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/stat-card";
import { TransactionRow } from "@/components/transaction-row";
import { HideableBalance } from "@/components/hideable-balance";
import { LoanReminderBanner } from "@/components/loan-reminder-banner";
import { RecurringSuggestionsBanner } from "@/components/recurring-suggestions-banner";
import {
  getDashboardSummary,
  listTransactions,
  listRecentExpensesForRecurringDetection,
} from "@/lib/services/transactions";
import { getAccountBalances } from "@/lib/services/accounts";
import { getInvestmentSummary } from "@/lib/services/investments";
import { getLoanNetEffect, listLoanReminders } from "@/lib/services/loans";
import { getProfile } from "@/lib/services/profile";
import { listCategories } from "@/lib/services/categories";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { detectRecurringTransactions } from "@/lib/domain/recurring";

export default async function DashboardPage() {
  const now = new Date();
  const monthStart = format(startOfMonth(now), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(now), "yyyy-MM-dd");

  const [profile, summary, { transactions }, balances, investmentSummary, loanNet, loanReminders, categories, recentExpenses] =
    await Promise.all([
      getProfile(),
      getDashboardSummary(monthStart, monthEnd),
      listTransactions({ pageSize: 6 }),
      getAccountBalances(),
      getInvestmentSummary(),
      getLoanNetEffect(),
      listLoanReminders(),
      listCategories(),
      listRecentExpensesForRecurringDetection(),
    ]);

  const currency = profile?.currency ?? "BDT";
  const accountNameById = new Map(balances.accounts.map((a) => [a.id, a.name]));
  const categoryNameById = new Map(categories.map((c) => [c.id, c.name]));
  const recurringSuggestions = detectRecurringTransactions(
    recentExpenses.map((t) => ({
      categoryId: t.category_id,
      accountId: t.account_id,
      amount: Number(t.amount),
      occurredOn: t.occurred_on,
      note: t.note,
    })),
    format(now, "yyyy-MM-dd"),
  );
  const hasInvestments = investmentSummary.totalCurrentValue > 0;
  const hasLoans = loanNet.owedToYou !== 0 || loanNet.youOwe !== 0;
  const hasExtras = hasInvestments || hasLoans;
  const netWorth = balances.total + investmentSummary.totalCurrentValue + loanNet.net;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-sm text-muted-foreground">{format(now, "MMMM yyyy")}</p>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
      </div>

      <StatCard
        label={hasExtras ? "Net worth" : "Total balance"}
        amount={netWorth}
        icon={<Wallet className="h-6 w-6" />}
        tone={netWorth >= 0 ? "positive" : "negative"}
        hero
      />

      <LoanReminderBanner reminders={loanReminders} currency={currency} />
      <RecurringSuggestionsBanner
        suggestions={recurringSuggestions}
        categoryNameById={categoryNameById}
        currency={currency}
      />

      {(balances.accounts.length > 0 || balances.unassigned !== 0 || hasExtras) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{hasExtras ? "Breakdown" : "Accounts"}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {hasInvestments && (
              <Link
                href="/investments"
                className="flex items-center justify-between text-sm hover:underline"
              >
                <span className="text-muted-foreground">Investments</span>
                <span className="font-medium tabular-nums text-foreground">
                  {formatCurrency(investmentSummary.totalCurrentValue, currency)}
                </span>
              </Link>
            )}
            {loanNet.owedToYou !== 0 && (
              <Link
                href="/loans"
                className="flex items-center justify-between text-sm hover:underline"
              >
                <span className="text-muted-foreground">Owed to you</span>
                <span className="font-medium tabular-nums text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(loanNet.owedToYou, currency)}
                </span>
              </Link>
            )}
            {loanNet.youOwe !== 0 && (
              <Link
                href="/loans"
                className="flex items-center justify-between text-sm hover:underline"
              >
                <span className="text-muted-foreground">You owe</span>
                <span className="font-medium tabular-nums text-rose-600 dark:text-rose-400">
                  -{formatCurrency(loanNet.youOwe, currency)}
                </span>
              </Link>
            )}
            {balances.accounts.map((a) => (
              <div key={a.id} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{a.name}</span>
                <HideableBalance amount={a.balance} currency={currency} />
              </div>
            ))}
            {balances.unassigned !== 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">No account set</span>
                <span
                  className={cn(
                    "font-medium tabular-nums",
                    balances.unassigned >= 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400",
                  )}
                >
                  {formatCurrency(balances.unassigned, currency)}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-3">
        <StatCard
          label="Net this month"
          amount={summary.net}
          icon={<Scale className="h-5 w-5" />}
          tone={summary.net >= 0 ? "positive" : "negative"}
        />
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Income"
            amount={summary.income}
            icon={<ArrowDownLeft className="h-5 w-5" />}
            tone="positive"
            delay={0.05}
          />
          <StatCard
            label="Expense"
            amount={summary.expense}
            icon={<ArrowUpRight className="h-5 w-5" />}
            tone="negative"
            delay={0.1}
          />
        </div>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Recent activity</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={
              <Link href="/transactions">
                See all
                <ChevronRight className="h-4 w-4" />
              </Link>
            }
          />
        </CardHeader>
        <CardContent className="flex flex-col gap-0.5">
          {transactions.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Receipt className="h-5 w-5" />
              </div>
              <p className="text-sm text-muted-foreground">
                No transactions yet — tap Add to log your first one.
              </p>
            </div>
          ) : (
            transactions.map((tx) => (
              <TransactionRow key={tx.id} tx={tx} currency={currency} accountNameById={accountNameById} />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
