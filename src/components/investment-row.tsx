import Link from "next/link";
import { formatCurrency } from "@/lib/format";
import { computeGainLoss, humanizeInvestmentType } from "@/lib/domain/investment";
import { cn } from "@/lib/utils";

export interface InvestmentRowData {
  id: string;
  name: string;
  type: string;
  amount_invested: number;
  current_value: number;
}

export function InvestmentRow({ investment, currency }: { investment: InvestmentRowData; currency?: string }) {
  const { amount, percent } = computeGainLoss(
    Number(investment.amount_invested),
    Number(investment.current_value),
  );
  const positive = amount >= 0;

  return (
    <Link
      href={`/investments/${investment.id}/edit`}
      className="flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/60"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{investment.name}</p>
        <p className="text-xs text-muted-foreground">
          {humanizeInvestmentType(investment.type)} ·{" "}
          {formatCurrency(Number(investment.current_value), currency)}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p
          className={cn(
            "text-sm font-semibold tabular-nums",
            positive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400",
          )}
        >
          {positive ? "+" : ""}
          {formatCurrency(amount, currency)}
        </p>
        {percent !== null && (
          <p
            className={cn(
              "text-xs tabular-nums",
              positive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400",
            )}
          >
            {positive ? "+" : ""}
            {percent.toFixed(1)}%
          </p>
        )}
      </div>
    </Link>
  );
}
