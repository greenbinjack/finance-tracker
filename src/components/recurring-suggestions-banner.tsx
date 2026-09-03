import Link from "next/link";
import { Repeat } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/format";
import type { RecurringSuggestion } from "@/lib/domain/recurring";

export function RecurringSuggestionsBanner({
  suggestions,
  categoryNameById,
  currency,
}: {
  suggestions: RecurringSuggestion[];
  categoryNameById: Map<string, string>;
  currency?: string;
}) {
  if (suggestions.length === 0) return null;

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="flex flex-col gap-2 p-4">
        <div className="flex items-center gap-2 text-primary">
          <Repeat className="h-4 w-4 shrink-0" />
          <p className="text-sm font-medium">Looks like these are due again</p>
        </div>
        <div className="flex flex-col gap-1.5">
          {suggestions.map((s) => {
            const params = new URLSearchParams({ amount: String(s.amount) });
            if (s.categoryId) params.set("category", s.categoryId);
            if (s.accountId) params.set("account", s.accountId);
            if (s.note) params.set("note", s.note);
            return (
              <Link
                key={`${s.categoryId}-${s.amount}`}
                href={`/transactions/new?${params.toString()}`}
                className="flex items-center justify-between gap-3 text-sm hover:underline"
              >
                <span className="min-w-0 truncate">
                  {s.categoryId ? (categoryNameById.get(s.categoryId) ?? "Expense") : "Expense"}
                  {s.note ? ` · ${s.note}` : ""}
                </span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {formatCurrency(s.amount, currency)} · due {formatDate(s.nextDueOn)}
                </span>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
