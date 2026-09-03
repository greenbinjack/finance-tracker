import { ArrowDownLeft, ArrowUpRight, Pencil, Trash2 } from "lucide-react";
import { formatCurrency, formatDateShort } from "@/lib/format";
import { renderCategoryIcon } from "@/lib/category-icons";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { AddEventExpenseDialog } from "@/components/add-event-expense-dialog";
import { deleteTransactionInlineAction } from "@/app/(app)/transactions/actions";

export interface EventTransactionData {
  id: string;
  type: "expense" | "income";
  amount: number;
  category_id: string | null;
  account_id: string | null;
  occurred_on: string;
  note: string | null;
  paid_by_participant_id: string | null;
  is_external: boolean;
  categories: { name: string; icon: string | null } | null;
  splits?: { participant_id: string | null; amount: number }[];
}

interface CategoryOption {
  id: string;
  name: string;
  type: "expense" | "income";
  icon?: string | null;
}

interface SelectOption {
  id: string;
  name: string;
}

export function EventExpenseRow({
  eventId,
  tx,
  currency,
  participants,
  categories,
  accounts,
}: {
  eventId: string;
  tx: EventTransactionData;
  currency?: string;
  participants: SelectOption[];
  categories: CategoryOption[];
  accounts: SelectOption[];
}) {
  const isIncome = tx.type === "income";
  const givenByName = tx.is_external
    ? "External"
    : tx.paid_by_participant_id
      ? participants.find((p) => p.id === tx.paid_by_participant_id)?.name
      : null;

  return (
    <div className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/60">
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-1",
          isIncome
            ? "bg-emerald-500/10 text-emerald-600 ring-emerald-500/15 dark:text-emerald-400"
            : "bg-rose-500/10 text-rose-600 ring-rose-500/15 dark:text-rose-400",
        )}
      >
        {tx.categories ? (
          renderCategoryIcon(tx.categories.icon, "h-4 w-4")
        ) : isIncome ? (
          <ArrowDownLeft className="h-4 w-4" />
        ) : (
          <ArrowUpRight className="h-4 w-4" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {tx.categories?.name ?? (isIncome ? "Income" : "Expense")}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {formatDateShort(tx.occurred_on)}
          {tx.note ? ` · ${tx.note}` : ""}
          {givenByName ? ` · Given by ${givenByName}` : ""}
          {tx.splits && tx.splits.length > 0 ? " · Custom split" : ""}
        </p>
      </div>

      <p
        className={cn(
          "shrink-0 text-sm font-semibold tabular-nums",
          isIncome ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400",
        )}
      >
        {isIncome ? "+" : "-"}
        {formatCurrency(tx.amount, currency)}
      </p>

      <div className="flex shrink-0 items-center gap-0.5">
        <AddEventExpenseDialog
          eventId={eventId}
          categories={categories}
          accounts={accounts}
          participants={participants}
          existing={tx}
          trigger={
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              nativeButton={false}
              render={
                <span>
                  <Pencil className="h-3.5 w-3.5" />
                </span>
              }
            />
          }
        />
        <ConfirmDialog
          title="Delete this transaction?"
          description="This can't be undone."
          onConfirm={deleteTransactionInlineAction.bind(null, tx.id, eventId)}
          errorMessage="Couldn't delete this transaction. Please try again."
          trigger={
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              nativeButton={false}
              render={
                <span>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </span>
              }
            />
          }
        />
      </div>
    </div>
  );
}
