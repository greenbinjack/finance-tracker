import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Pencil, Trash2 } from "lucide-react";
import { formatCurrency, formatDateShort } from "@/lib/format";
import { renderCategoryIcon } from "@/lib/category-icons";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { deleteTransactionInlineAction } from "@/app/(app)/transactions/actions";
import type { TransactionKind } from "@/lib/supabase/database.types";

export interface TransactionRowData {
  id: string;
  type: TransactionKind;
  amount: number;
  occurred_on: string;
  note: string | null;
  event_id: string | null;
  account_id: string | null;
  to_account_id: string | null;
  categories: { name: string; icon: string | null } | null;
  accounts: { name: string } | null;
}

export function TransactionRow({
  tx,
  currency,
  accountNameById,
}: {
  tx: TransactionRowData;
  currency?: string;
  /** Only needed for transfer rows, to show "Cash → Bank" — the destination account isn't embedded via the query (see listTransactions). */
  accountNameById?: Map<string, string>;
}) {
  if (tx.type === "transfer") {
    const fromName = tx.accounts?.name ?? (tx.account_id && accountNameById?.get(tx.account_id)) ?? "Unknown";
    const toName = (tx.to_account_id && accountNameById?.get(tx.to_account_id)) ?? "Unknown";

    return (
      <div className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/60">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground ring-1 ring-border">
          <ArrowLeftRight className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">Transfer</p>
          <p className="truncate text-xs text-muted-foreground">
            {formatDateShort(tx.occurred_on)} · {fromName} → {toName}
            {tx.note ? ` · ${tx.note}` : ""}
          </p>
        </div>

        <p className="shrink-0 text-sm font-semibold tabular-nums text-muted-foreground">
          {formatCurrency(tx.amount, currency)}
        </p>

        <div className="flex shrink-0 items-center gap-0.5">
          <ConfirmDialog
            title="Delete this transfer?"
            description="This can't be undone."
            onConfirm={deleteTransactionInlineAction.bind(null, tx.id, tx.event_id)}
            errorMessage="Couldn't delete this transfer. Please try again."
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

  const isIncome = tx.type === "income";

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
          {tx.accounts?.name ? ` · ${tx.accounts.name}` : ""}
          {tx.note ? ` · ${tx.note}` : ""}
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
        <Button
          variant="ghost"
          size="icon-sm"
          nativeButton={false}
          render={
            <Link href={`/transactions/${tx.id}/edit`} aria-label="Edit transaction">
              <Pencil className="h-3.5 w-3.5" />
            </Link>
          }
        />
        <ConfirmDialog
          title="Delete this transaction?"
          description="This can't be undone."
          onConfirm={deleteTransactionInlineAction.bind(null, tx.id, tx.event_id)}
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
