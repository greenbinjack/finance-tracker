import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/format";
import { computeEventBudgetStatus } from "@/lib/domain/event";
import { cn } from "@/lib/utils";

export interface EventRowData {
  id: string;
  name: string;
  budget_amount: number | null;
  start_date: string | null;
  end_date: string | null;
  spent: number;
}

export function EventRow({ event, currency }: { event: EventRowData; currency?: string }) {
  const status = computeEventBudgetStatus(
    event.spent,
    event.budget_amount === null ? null : Number(event.budget_amount),
  );

  return (
    <Link
      href={`/events/${event.id}`}
      className="flex flex-col gap-1.5 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/60"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="truncate text-sm font-medium">{event.name}</p>
        <p className="shrink-0 text-sm font-semibold tabular-nums">
          {formatCurrency(event.spent, currency)}
          {status.budget !== null && (
            <span className="text-muted-foreground"> / {formatCurrency(status.budget, currency)}</span>
          )}
        </p>
      </div>
      {(event.start_date || event.end_date) && (
        <p className="text-xs text-muted-foreground">
          {event.start_date && formatDate(event.start_date)}
          {event.start_date && event.end_date && " – "}
          {event.end_date && formatDate(event.end_date)}
        </p>
      )}
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
    </Link>
  );
}
