"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Trash2, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { TransactionRow, type TransactionRowData } from "@/components/transaction-row";
import { formatDate } from "@/lib/format";
import {
  bulkDeleteTransactionsAction,
  bulkRecategorizeTransactionsAction,
} from "@/app/(app)/transactions/actions";

interface CategoryOption {
  id: string;
  name: string;
}

export function TransactionHistoryList({
  transactions,
  currency,
  accountNameById,
  categories,
}: {
  transactions: TransactionRowData[];
  currency?: string;
  accountNameById: Record<string, string>;
  categories: CategoryOption[];
}) {
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [recatOpen, setRecatOpen] = useState(false);
  const [recatCategoryId, setRecatCategoryId] = useState("");
  const [isPending, setIsPending] = useState(false);

  const accountMap = new Map(Object.entries(accountNameById));

  const groups = transactions.reduce<Record<string, TransactionRowData[]>>((acc, tx) => {
    (acc[tx.occurred_on] ??= []).push(tx);
    return acc;
  }, {});

  const selectedCount = selected.size;
  const eligibleForRecategorize = transactions.filter((t) => selected.has(t.id) && t.type !== "transfer");

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelected(new Set());
  }

  async function handleBulkDelete() {
    setIsPending(true);
    try {
      const ids = Array.from(selected);
      await bulkDeleteTransactionsAction(ids);
      toast.success(`Deleted ${ids.length} transaction${ids.length === 1 ? "" : "s"}`);
      exitSelectMode();
    } catch {
      toast.error("Couldn't delete those transactions. Please try again.");
    } finally {
      setIsPending(false);
    }
  }

  async function handleBulkRecategorize() {
    if (!recatCategoryId || eligibleForRecategorize.length === 0) return;
    setIsPending(true);
    try {
      const ids = eligibleForRecategorize.map((t) => t.id);
      await bulkRecategorizeTransactionsAction(ids, recatCategoryId);
      toast.success(`Re-categorized ${ids.length} transaction${ids.length === 1 ? "" : "s"}`);
      setRecatOpen(false);
      setRecatCategoryId("");
      exitSelectMode();
    } catch {
      toast.error("Couldn't re-categorize those transactions. Please try again.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 pb-16">
      {transactions.length > 0 && (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => (selectMode ? exitSelectMode() : setSelectMode(true))}
          >
            {selectMode ? "Cancel" : "Select"}
          </Button>
        </div>
      )}

      {Object.entries(groups).map(([date, txs]) => (
        <div key={date}>
          <p className="mb-1 px-2 text-xs font-medium text-muted-foreground">{formatDate(date)}</p>
          <div className="flex flex-col gap-0.5">
            {txs.map((tx) => (
              <div key={tx.id} className="flex items-center gap-1">
                {selectMode && (
                  <Checkbox
                    checked={selected.has(tx.id)}
                    onCheckedChange={() => toggle(tx.id)}
                    className="ml-1 shrink-0"
                    aria-label="Select transaction"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <TransactionRow tx={tx} currency={currency} accountNameById={accountMap} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {selectMode && selectedCount > 0 && (
        <div className="fixed inset-x-0 bottom-16 z-40 flex justify-center px-4">
          <div className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-2 shadow-lg">
            <span className="px-1 text-xs text-muted-foreground">{selectedCount} selected</span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isPending || eligibleForRecategorize.length === 0}
              onClick={() => setRecatOpen(true)}
            >
              <Tag className="h-3.5 w-3.5" />
              Re-categorize
            </Button>
            <ConfirmDialog
              title={`Delete ${selectedCount} transaction${selectedCount === 1 ? "" : "s"}?`}
              description="This can't be undone."
              confirmLabel="Delete"
              onConfirm={handleBulkDelete}
              errorMessage="Couldn't delete those transactions. Please try again."
              trigger={
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  disabled={isPending}
                  nativeButton={false}
                  render={
                    <span>
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </span>
                  }
                />
              }
            />
          </div>
        </div>
      )}

      <Dialog open={recatOpen} onOpenChange={setRecatOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Re-categorize {eligibleForRecategorize.length} transaction{eligibleForRecategorize.length === 1 ? "" : "s"}
            </DialogTitle>
          </DialogHeader>
          {eligibleForRecategorize.length < selectedCount && (
            <p className="text-xs text-muted-foreground">
              Transfers among your selection are skipped — they don&apos;t have a category.
            </p>
          )}
          <Select value={recatCategoryId} onValueChange={(v) => setRecatCategoryId(v ?? "")}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose a category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setRecatOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="button" disabled={!recatCategoryId || isPending} onClick={handleBulkRecategorize}>
              {isPending ? "Applying..." : "Apply"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
