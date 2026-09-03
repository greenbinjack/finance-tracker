"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import { isRedirectError } from "@/lib/is-redirect-error";
import {
  createScheduledItemAction,
  updateScheduledItemAction,
  deleteScheduledItemAction,
} from "@/app/(app)/events/actions";

export interface ScheduledItemRecord {
  id: string;
  type: "expense" | "income";
  amount: number;
  note: string | null;
  fulfilled: number;
}

export function ScheduledItemDialog({
  eventId,
  trigger,
  existing,
  currency,
}: {
  eventId: string;
  trigger: React.ReactNode;
  existing?: ScheduledItemRecord;
  currency?: string;
}) {
  const isEditing = Boolean(existing);
  const typeLocked = Boolean(existing && existing.fulfilled > 0);
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"expense" | "income">(existing?.type ?? "expense");
  const [amount, setAmount] = useState(existing ? String(existing.amount) : "");
  const [note, setNote] = useState(existing?.note ?? "");
  const [isPending, startTransition] = useTransition();

  function resetToExisting() {
    setType(existing?.type ?? "expense");
    setAmount(existing ? String(existing.amount) : "");
    setNote(existing?.note ?? "");
  }

  function handleSave() {
    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      toast.error("Enter an amount greater than 0");
      return;
    }
    if (existing && parsedAmount < existing.fulfilled) {
      toast.error(
        `Can't go below ${formatCurrency(existing.fulfilled, currency)} — that much is already recorded against this plan`,
      );
      return;
    }

    const input = { type, amount: parsedAmount, note: note || undefined };

    startTransition(async () => {
      try {
        if (existing) {
          await updateScheduledItemAction(eventId, existing.id, input);
          toast.success("Changes saved");
        } else {
          await createScheduledItemAction(eventId, input);
          toast.success("Planned item added");
          resetToExisting();
        }
        setOpen(false);
      } catch (error) {
        if (isRedirectError(error)) throw error;
        toast.error("Couldn't save that. Please try again.");
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) resetToExisting();
      }}
    >
      <DialogTrigger className="inline-flex">{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit planned item" : "Plan for this trip"}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
          {(["expense", "income"] as const).map((t) => (
            <button
              key={t}
              type="button"
              disabled={typeLocked}
              onClick={() => setType(t)}
              className={cn(
                "rounded-md py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                type === t ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
              )}
            >
              {t === "expense" ? "We'll need this" : "We'll get this"}
            </button>
          ))}
        </div>
        {typeLocked && (
          <p className="-mt-1 text-xs text-muted-foreground">
            Can&apos;t change type — money has already been recorded against this plan.
          </p>
        )}

        <div className="flex flex-col gap-2">
          <Label htmlFor="scheduled-item-amount">Amount</Label>
          <Input
            id="scheduled-item-amount"
            type="number"
            inputMode="decimal"
            step="0.01"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          {existing && existing.fulfilled > 0 && (
            <p className="text-xs text-muted-foreground">
              {formatCurrency(existing.fulfilled, currency)} already recorded against this — can&apos;t go below that.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="scheduled-item-note">Label (optional)</Label>
          <Input
            id="scheduled-item-note"
            placeholder="e.g. Hotel"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <DialogFooter>
          <Button type="button" disabled={isPending} onClick={handleSave} className="w-full sm:w-auto">
            {isPending ? "Saving..." : isEditing ? "Save changes" : "Add plan"}
          </Button>
          {existing && (
            <ConfirmDialog
              title="Delete this planned item?"
              description="Any money already logged against it stays in your trip's Money list — this only removes the plan."
              onConfirm={() => deleteScheduledItemAction(eventId, existing.id)}
              errorMessage="Couldn't delete this. Please try again."
              trigger={
                <Button
                  type="button"
                  variant="destructive"
                  nativeButton={false}
                  className="w-full sm:w-auto"
                  render={
                    <span>
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </span>
                  }
                />
              }
            />
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
