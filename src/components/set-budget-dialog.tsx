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
import { isRedirectError } from "@/lib/is-redirect-error";
import { setBudgetAction, deleteBudgetAction } from "@/app/(app)/budgets/actions";

export function SetBudgetDialog({
  categoryId,
  categoryName,
  month,
  budgetId,
  cap,
  trigger,
}: {
  categoryId: string;
  categoryName: string;
  month: string;
  budgetId: string | null;
  cap: number | null;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(cap ? String(cap) : "");
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      toast.error("Enter an amount greater than 0");
      return;
    }
    startTransition(async () => {
      try {
        await setBudgetAction({ category_id: categoryId, month, cap_amount: parsedAmount });
        toast.success("Budget saved");
        setOpen(false);
      } catch (error) {
        if (isRedirectError(error)) throw error;
        toast.error("Couldn't save that budget. Please try again.");
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setAmount(cap ? String(cap) : "");
      }}
    >
      <DialogTrigger className="inline-flex">{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{categoryName} budget</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <Label htmlFor="budget-cap">Monthly cap</Label>
          <Input
            id="budget-cap"
            type="number"
            inputMode="decimal"
            step="0.01"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <DialogFooter>
          <Button type="button" disabled={isPending} onClick={handleSave} className="w-full sm:w-auto">
            {isPending ? "Saving..." : "Save"}
          </Button>
          {budgetId && (
            <ConfirmDialog
              title={`Remove ${categoryName}'s budget?`}
              description="This can't be undone."
              onConfirm={deleteBudgetAction.bind(null, budgetId)}
              errorMessage="Couldn't remove that budget. Please try again."
              trigger={
                <Button
                  type="button"
                  variant="destructive"
                  nativeButton={false}
                  className="w-full sm:w-auto"
                  render={
                    <span>
                      <Trash2 className="h-4 w-4" />
                      Remove
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
