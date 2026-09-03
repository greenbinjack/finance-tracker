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
import { recordSettlementAction } from "@/app/(app)/events/actions";
import type { BalanceRow } from "@/components/event-balance-table";

const ME_VALUE = "__me__";

function toSelectValue(id: string | null) {
  return id === null ? ME_VALUE : id;
}

function fromSelectValue(value: string) {
  return value === ME_VALUE ? null : value;
}

/** The row with the most extreme balance in the given direction, excluding one participant. */
function pickCounterpart(rows: BalanceRow[], exclude: string | null, direction: "owed" | "owing") {
  const candidates = rows.filter((r) => r.participantId !== exclude);
  if (candidates.length === 0) return null;
  return candidates.reduce((best, r) =>
    direction === "owed" ? (r.balance > best.balance ? r : best) : r.balance < best.balance ? r : best,
  );
}

export function SettleTransferDialog({
  eventId,
  rows,
  currency,
  initiatingParticipantId,
  trigger,
}: {
  eventId: string;
  rows: BalanceRow[];
  currency?: string;
  /** The row the settle icon was clicked from — used to pick a sensible starting from/to pair. */
  initiatingParticipantId?: string | null;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [fromId, setFromId] = useState<string | null>(null);
  const [toId, setToId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayLocalDate());
  const [isPending, startTransition] = useTransition();

  function initialize() {
    const initiating = rows.find((r) => r.participantId === (initiatingParticipantId ?? null));
    let from: BalanceRow | null;
    let to: BalanceRow | null;

    if (initiating && initiating.balance < 0) {
      from = initiating;
      to = pickCounterpart(rows, initiating.participantId, "owed");
    } else if (initiating && initiating.balance > 0) {
      to = initiating;
      from = pickCounterpart(rows, initiating.participantId, "owing");
    } else {
      from = pickCounterpart(rows, null, "owing");
      to = pickCounterpart(rows, from?.participantId ?? null, "owed");
    }

    setFromId(from?.participantId ?? null);
    setToId(to?.participantId ?? null);
    setAmount(from && to ? String(Math.min(Math.abs(from.balance), Math.abs(to.balance))) : "");
    setDate(todayLocalDate());
  }

  const fromRow = rows.find((r) => r.participantId === fromId);
  const toRow = rows.find((r) => r.participantId === toId);

  function handleSave() {
    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      toast.error("Enter an amount greater than 0");
      return;
    }
    if (fromId === toId) {
      toast.error("Pick two different people");
      return;
    }

    startTransition(async () => {
      try {
        await recordSettlementAction(
          eventId,
          { from: fromRow?.name ?? "Myself", to: toRow?.name ?? "Myself" },
          {
            from_participant_id: fromId,
            to_participant_id: toId,
            amount: parsedAmount,
            settled_on: date,
          },
        );
        toast.success("Settlement recorded");
        setOpen(false);
      } catch (error) {
        if (isRedirectError(error)) throw error;
        toast.error("Couldn't record that settlement. Please try again.");
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) initialize();
      }}
    >
      <DialogTrigger className="inline-flex">{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Settle up</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <Label>From</Label>
            <Select value={toSelectValue(fromId)} onValueChange={(v) => setFromId(fromSelectValue(v ?? ME_VALUE))}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Myself">
                  {(value: string) =>
                    value === ME_VALUE ? "Myself" : rows.find((r) => r.participantId === value)?.name ?? "Myself"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {rows
                  .filter((r) => r.participantId !== toId)
                  .map((r) => (
                    <SelectItem key={r.participantId ?? ME_VALUE} value={toSelectValue(r.participantId)}>
                      {r.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label>To</Label>
            <Select value={toSelectValue(toId)} onValueChange={(v) => setToId(fromSelectValue(v ?? ME_VALUE))}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Myself">
                  {(value: string) =>
                    value === ME_VALUE ? "Myself" : rows.find((r) => r.participantId === value)?.name ?? "Myself"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {rows
                  .filter((r) => r.participantId !== fromId)
                  .map((r) => (
                    <SelectItem key={r.participantId ?? ME_VALUE} value={toSelectValue(r.participantId)}>
                      {r.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="settle-amount">Amount</Label>
          <Input
            id="settle-amount"
            type="number"
            inputMode="decimal"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          {fromRow && toRow && (
            <p className="text-xs text-muted-foreground">
              {fromRow.name} owes {formatCurrency(Math.abs(fromRow.balance), currency)} · {toRow.name} is owed{" "}
              {formatCurrency(Math.abs(toRow.balance), currency)}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="settle-date">Date</Label>
          <Input id="settle-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        <DialogFooter>
          <Button type="button" disabled={isPending} onClick={handleSave}>
            {isPending ? "Saving..." : "Record settlement"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
