"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { todayLocalDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/format";
import { isRedirectError } from "@/lib/is-redirect-error";
import { createEventExpenseAction } from "@/app/(app)/events/actions";

const ME_VALUE = "__me__";
const EXTERNAL_VALUE = "__external__";

export function FulfillScheduledItemDialog({
  eventId,
  scheduledItemId,
  type,
  remaining,
  label,
  participants,
  currency,
  trigger,
}: {
  eventId: string;
  scheduledItemId: string;
  type: "expense" | "income";
  remaining: number;
  label: string;
  participants: { id: string; name: string }[];
  currency?: string;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(remaining));
  const [givenBy, setGivenBy] = useState(ME_VALUE);
  const [date, setDate] = useState(todayLocalDate());
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      toast.error("Enter an amount greater than 0");
      return;
    }

    const isExternal = givenBy === EXTERNAL_VALUE;

    startTransition(async () => {
      try {
        await createEventExpenseAction(eventId, {
          type,
          amount: parsedAmount,
          category_id: null,
          account_id: null,
          occurred_on: date,
          note: label,
          paid_by_participant_id: isExternal || givenBy === ME_VALUE ? null : givenBy,
          is_external: isExternal,
          scheduled_item_id: scheduledItemId,
        });
        toast.success("Recorded");
        setOpen(false);
      } catch (error) {
        if (isRedirectError(error)) throw error;
        toast.error("Couldn't record that. Please try again.");
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setAmount(String(remaining));
          setGivenBy(ME_VALUE);
          setDate(todayLocalDate());
        }
      }}
    >
      <DialogTrigger className="inline-flex">{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record payment for {label}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <Label htmlFor="fulfill-amount">Amount</Label>
          <Input
            id="fulfill-amount"
            type="number"
            inputMode="decimal"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            {formatCurrency(remaining, currency)} still planned
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Label>Given by</Label>
          <Select value={givenBy} onValueChange={(value) => setGivenBy(value ?? ME_VALUE)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Myself">
                {(value: string) => {
                  if (value === ME_VALUE) return "Myself";
                  if (value === EXTERNAL_VALUE) return "External";
                  return participants.find((p) => p.id === value)?.name ?? "Myself";
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ME_VALUE}>Myself</SelectItem>
              {participants.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
              <SelectItem value={EXTERNAL_VALUE}>External (outside the group)</SelectItem>
            </SelectContent>
          </Select>
          {givenBy === EXTERNAL_VALUE && (
            <p className="text-xs text-muted-foreground">
              Counts toward the trip total, but not toward anyone&apos;s split.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="fulfill-date">Date</Label>
          <Input id="fulfill-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        <DialogFooter>
          <Button type="button" disabled={isPending} onClick={handleSave}>
            {isPending ? "Saving..." : "Record"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
