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
import { isRedirectError } from "@/lib/is-redirect-error";
import { createTransferAction } from "@/app/(app)/settings/actions";

interface SelectOption {
  id: string;
  name: string;
}

export function TransferDialog({
  accounts,
  trigger,
}: {
  accounts: SelectOption[];
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayLocalDate());
  const [note, setNote] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function reset() {
    setFromId(accounts[0]?.id ?? "");
    setToId(accounts[1]?.id ?? accounts[0]?.id ?? "");
    setAmount("");
    setDate(todayLocalDate());
    setNote("");
    setPassword("");
    setError(null);
  }

  function handleSave() {
    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      toast.error("Enter an amount greater than 0");
      return;
    }
    if (fromId === toId) {
      toast.error("Pick two different accounts");
      return;
    }
    if (!password) {
      setError("Enter your password to confirm this transfer");
      return;
    }
    setError(null);

    startTransition(async () => {
      try {
        await createTransferAction({
          from_account_id: fromId,
          to_account_id: toId,
          amount: parsedAmount,
          occurred_on: date,
          note: note || undefined,
          password,
        });
        toast.success("Transfer recorded");
        setOpen(false);
      } catch (err) {
        if (isRedirectError(err)) throw err;
        const message = err instanceof Error ? err.message : "Couldn't record that transfer.";
        setError(message === "Incorrect password" ? message : null);
        if (message !== "Incorrect password") toast.error("Couldn't record that transfer. Please try again.");
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) reset();
      }}
    >
      <DialogTrigger className="inline-flex">{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transfer between accounts</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <Label>From</Label>
            <Select value={fromId} onValueChange={(v) => setFromId(v ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select">
                  {(value: string) => accounts.find((a) => a.id === value)?.name ?? "Select"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {accounts
                  .filter((a) => a.id !== toId)
                  .map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label>To</Label>
            <Select value={toId} onValueChange={(v) => setToId(v ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select">
                  {(value: string) => accounts.find((a) => a.id === value)?.name ?? "Select"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {accounts
                  .filter((a) => a.id !== fromId)
                  .map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="transfer-amount">Amount</Label>
          <Input
            id="transfer-amount"
            type="number"
            inputMode="decimal"
            step="0.01"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="transfer-date">Date</Label>
          <Input id="transfer-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="transfer-note">Note (optional)</Label>
          <Input id="transfer-note" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>

        <div className="flex flex-col gap-2 rounded-lg border border-dashed p-3">
          <Label htmlFor="transfer-password">Password</Label>
          <Input
            id="transfer-password"
            type="password"
            autoComplete="current-password"
            placeholder="Confirm this transfer with your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button type="button" disabled={isPending} onClick={handleSave}>
            {isPending ? "Transferring..." : "Transfer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
