import { TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { computePeriodComparison, type IncomeExpenseSummary } from "@/lib/domain/reports";

function DeltaBadge({ percent, goodWhenUp }: { percent: number | null; goodWhenUp: boolean }) {
  if (percent === null) return <span className="text-xs text-muted-foreground">new</span>;
  const isUp = percent >= 0;
  const isGood = isUp === goodWhenUp;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium tabular-nums",
        isGood ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400",
      )}
    >
      {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {Math.abs(percent).toFixed(0)}%
    </span>
  );
}

export function ReportRecap({
  current,
  previous,
  currency,
}: {
  current: IncomeExpenseSummary;
  previous: IncomeExpenseSummary;
  currency: string;
}) {
  const comparison = computePeriodComparison(current, previous);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">vs. last period</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-3 gap-2">
        <div className="flex flex-col gap-1">
          <p className="text-xs text-muted-foreground">Income</p>
          <p className="text-sm font-semibold tabular-nums">{formatCurrency(current.income, currency)}</p>
          <DeltaBadge percent={comparison.income.percent} goodWhenUp={true} />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-xs text-muted-foreground">Expense</p>
          <p className="text-sm font-semibold tabular-nums">{formatCurrency(current.expense, currency)}</p>
          <DeltaBadge percent={comparison.expense.percent} goodWhenUp={false} />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-xs text-muted-foreground">Net</p>
          <p className="text-sm font-semibold tabular-nums">{formatCurrency(current.net, currency)}</p>
          <DeltaBadge percent={comparison.net.percent} goodWhenUp={true} />
        </div>
      </CardContent>
    </Card>
  );
}
