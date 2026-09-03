import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus, Pencil } from "lucide-react";
import { format, startOfMonth, addMonths, subMonths, parse } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SetBudgetDialog } from "@/components/set-budget-dialog";
import { listBudgetsForMonth } from "@/lib/services/budgets";
import { getProfile } from "@/lib/services/profile";
import { computeBudgetStatus } from "@/lib/domain/budgets";
import { formatCurrency } from "@/lib/format";
import { renderCategoryIcon } from "@/lib/category-icons";
import { cn } from "@/lib/utils";

export default async function BudgetsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParam } = await searchParams;
  const monthDate = monthParam
    ? parse(monthParam, "yyyy-MM-dd", new Date())
    : startOfMonth(new Date());
  const month = format(startOfMonth(monthDate), "yyyy-MM-dd");
  const prevMonth = format(subMonths(monthDate, 1), "yyyy-MM-dd");
  const nextMonth = format(addMonths(monthDate, 1), "yyyy-MM-dd");

  const [budgets, profile] = await Promise.all([listBudgetsForMonth(month), getProfile()]);
  const currency = profile?.currency;

  const totalCap = budgets.reduce((sum, b) => sum + (b.cap ?? 0), 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
  const overallStatus = computeBudgetStatus(totalSpent, totalCap || null);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Budgets</h1>
      </div>

      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          nativeButton={false}
          render={
            <Link href={`/budgets?month=${prevMonth}`}>
              <ChevronLeft className="h-4 w-4" />
            </Link>
          }
        />
        <p className="text-sm font-medium">{format(monthDate, "MMMM yyyy")}</p>
        <Button
          variant="ghost"
          size="icon"
          nativeButton={false}
          render={
            <Link href={`/budgets?month=${nextMonth}`}>
              <ChevronRight className="h-4 w-4" />
            </Link>
          }
        />
      </div>

      {totalCap > 0 && (
        <Card>
          <CardContent className="flex flex-col gap-2 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Total budgeted spend</p>
              <p className="text-sm font-semibold tabular-nums">
                {formatCurrency(totalSpent, currency)}
                <span className="text-muted-foreground"> / {formatCurrency(totalCap, currency)}</span>
              </p>
            </div>
            {overallStatus.percentUsed !== null && (
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    overallStatus.isOverBudget ? "bg-rose-500" : "bg-primary",
                  )}
                  style={{ width: `${Math.min(100, overallStatus.percentUsed)}%` }}
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-2">
        {budgets.map((b) => {
          const status = computeBudgetStatus(b.spent, b.cap);
          return (
            <Card key={b.categoryId}>
              <CardContent className="flex flex-col gap-2 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    {renderCategoryIcon(b.icon, "h-4 w-4 text-muted-foreground shrink-0")}
                    <p className="truncate text-sm font-medium">{b.categoryName}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <p
                      className={cn(
                        "text-sm font-semibold tabular-nums",
                        status.isOverBudget && "text-rose-600 dark:text-rose-400",
                      )}
                    >
                      {formatCurrency(b.spent, currency)}
                      {status.cap !== null && (
                        <span className="text-muted-foreground font-normal">
                          {" "}
                          / {formatCurrency(status.cap, currency)}
                        </span>
                      )}
                    </p>
                    <SetBudgetDialog
                      categoryId={b.categoryId}
                      categoryName={b.categoryName}
                      month={month}
                      budgetId={b.budgetId}
                      cap={b.cap}
                      trigger={
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          nativeButton={false}
                          render={
                            <span>
                              {b.cap === null ? <Plus className="h-4 w-4" /> : <Pencil className="h-3.5 w-3.5" />}
                            </span>
                          }
                        />
                      }
                    />
                  </div>
                </div>
                {status.percentUsed !== null && (
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        status.isOverBudget ? "bg-rose-500" : "bg-primary",
                      )}
                      style={{ width: `${Math.min(100, status.percentUsed)}%` }}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
        {budgets.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No expense categories yet — add one in Settings first.
          </p>
        )}
      </div>
    </div>
  );
}
