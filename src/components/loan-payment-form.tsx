"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoanPaymentForm({
  onSubmit,
}: {
  onSubmit: (input: { amount: number; paid_on: string }) => Promise<void>;
}) {
  const [amount, setAmount] = useState("");
  const [paidOn, setPaidOn] = useState(new Date().toISOString().slice(0, 10));
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      toast.error("Enter an amount greater than 0");
      return;
    }
    startTransition(async () => {
      try {
        await onSubmit({ amount: parsedAmount, paid_on: paidOn });
        setAmount("");
        toast.success("Payment logged");
      } catch {
        toast.error("Couldn't log that payment. Please try again.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2">
      <div className="flex flex-1 flex-col gap-1.5">
        <Label htmlFor="payment-amount" className="text-xs">
          Amount
        </Label>
        <Input
          id="payment-amount"
          type="number"
          inputMode="decimal"
          step="0.01"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>
      <div className="flex flex-1 flex-col gap-1.5">
        <Label htmlFor="payment-date" className="text-xs">
          Date
        </Label>
        <Input
          id="payment-date"
          type="date"
          value={paidOn}
          onChange={(e) => setPaidOn(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Adding..." : "Add"}
      </Button>
    </form>
  );
}
