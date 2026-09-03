"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
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
import { ConfirmDialog } from "@/components/confirm-dialog";
import { renderCategoryIcon } from "@/lib/category-icons";
import { cn } from "@/lib/utils";
import { todayLocalDate } from "@/lib/format";
import { isRedirectError } from "@/lib/is-redirect-error";
import {
  createEventExpenseAction,
  updateEventExpenseAction,
} from "@/app/(app)/events/actions";
import { deleteTransactionInlineAction } from "@/app/(app)/transactions/actions";
import { Trash2 } from "lucide-react";

const ME_VALUE = "__me__";
const EXTERNAL_VALUE = "__external__";

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

export interface EventExpenseRecord {
  id: string;
  type: "expense" | "income";
  amount: number;
  category_id: string | null;
  account_id: string | null;
  occurred_on: string;
  note: string | null;
  paid_by_participant_id: string | null;
  is_external: boolean;
  splits?: { participant_id: string | null; amount: number }[];
}

/** ME_VALUE stands in for the null participant id in split-editor state, since Map/object keys can't be null. */
function splitKey(participantId: string | null): string {
  return participantId === null ? ME_VALUE : participantId;
}

function givenBySelectValue(paidByParticipantId: string | null, isExternal: boolean): string {
  if (isExternal) return EXTERNAL_VALUE;
  return paidByParticipantId ?? ME_VALUE;
}

export function AddEventExpenseDialog({
  eventId,
  categories,
  accounts,
  participants,
  trigger,
  existing,
}: {
  eventId: string;
  categories: CategoryOption[];
  accounts: SelectOption[];
  participants: SelectOption[];
  trigger: React.ReactNode;
  /** When set, the dialog edits this transaction in place instead of creating a new one. */
  existing?: EventExpenseRecord;
}) {
  const isEditing = Boolean(existing);
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"expense" | "income">(existing?.type ?? "expense");
  const [amount, setAmount] = useState(existing ? String(existing.amount) : "");
  const [categoryId, setCategoryId] = useState(existing?.category_id ?? "");
  const [accountId, setAccountId] = useState(existing?.account_id ?? "");
  const [date, setDate] = useState(existing?.occurred_on ?? todayLocalDate());
  const [note, setNote] = useState(existing?.note ?? "");
  const [givenBy, setGivenBy] = useState(
    existing ? givenBySelectValue(existing.paid_by_participant_id, existing.is_external) : ME_VALUE,
  );
  const [splitMode, setSplitMode] = useState<"equal" | "custom">(
    existing?.splits && existing.splits.length > 0 ? "custom" : "equal",
  );
  const [splitIncluded, setSplitIncluded] = useState<Set<string>>(
    () => new Set((existing?.splits ?? []).map((s) => splitKey(s.participant_id))),
  );
  const [splitAmounts, setSplitAmounts] = useState<Record<string, string>>(() =>
    Object.fromEntries((existing?.splits ?? []).map((s) => [splitKey(s.participant_id), String(s.amount)])),
  );
  const [isPending, startTransition] = useTransition();

  const filteredCategories = categories.filter((c) => c.type === type);
  const splitPeople = [{ id: ME_VALUE, name: "Myself" }, ...participants.map((p) => ({ id: p.id, name: p.name }))];
  const splitSum = Object.entries(splitAmounts)
    .filter(([key]) => splitIncluded.has(key))
    .reduce((sum, [, v]) => sum + (Number(v) || 0), 0);

  function resetToExisting() {
    setType(existing?.type ?? "expense");
    setAmount(existing ? String(existing.amount) : "");
    setCategoryId(existing?.category_id ?? "");
    setAccountId(existing?.account_id ?? "");
    setDate(existing?.occurred_on ?? todayLocalDate());
    setNote(existing?.note ?? "");
    setGivenBy(existing ? givenBySelectValue(existing.paid_by_participant_id, existing.is_external) : ME_VALUE);
    setSplitMode(existing?.splits && existing.splits.length > 0 ? "custom" : "equal");
    setSplitIncluded(new Set((existing?.splits ?? []).map((s) => splitKey(s.participant_id))));
    setSplitAmounts(
      Object.fromEntries((existing?.splits ?? []).map((s) => [splitKey(s.participant_id), String(s.amount)])),
    );
  }

  function toggleSplitPerson(key: string, totalAmount: number) {
    setSplitIncluded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      // Auto-fill an even split across whoever's currently checked, as a
      // starting point the user can still hand-edit afterward.
      if (next.size > 0 && totalAmount > 0) {
        const even = (totalAmount / next.size).toFixed(2);
        setSplitAmounts((prevAmounts) => {
          const updated = { ...prevAmounts };
          for (const k of next) updated[k] = even;
          return updated;
        });
      }
      return next;
    });
  }

  function handleSave() {
    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      toast.error("Enter an amount greater than 0");
      return;
    }

    const isExternal = givenBy === EXTERNAL_VALUE;
    const useCustomSplit = type === "expense" && !isExternal && splitMode === "custom";

    if (useCustomSplit) {
      if (splitIncluded.size === 0) {
        toast.error("Pick at least one person to split with");
        return;
      }
      if (Math.abs(splitSum - parsedAmount) >= 0.01) {
        toast.error(`Split amounts must add up to ${amount} (currently ${splitSum.toFixed(2)})`);
        return;
      }
    }

    const input = {
      type,
      amount: parsedAmount,
      category_id: categoryId || null,
      account_id: accountId || null,
      occurred_on: date,
      note: note || undefined,
      paid_by_participant_id: isExternal || givenBy === ME_VALUE ? null : givenBy,
      is_external: isExternal,
      splits: useCustomSplit
        ? Array.from(splitIncluded).map((key) => ({
            participant_id: key === ME_VALUE ? null : key,
            amount: Number(splitAmounts[key] ?? 0),
          }))
        : undefined,
    };

    startTransition(async () => {
      try {
        if (existing) {
          await updateEventExpenseAction(eventId, existing.id, input);
          toast.success("Changes saved");
        } else {
          await createEventExpenseAction(eventId, input);
          toast.success(type === "expense" ? "Expense added" : "Income added");
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
          <DialogTitle>{isEditing ? "Edit trip transaction" : "Add money to this trip"}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
          {(["expense", "income"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={cn(
                "rounded-md py-2 text-sm font-medium capitalize transition-colors",
                type === t ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
              )}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="event-expense-amount">Amount</Label>
          <Input
            id="event-expense-amount"
            type="number"
            inputMode="decimal"
            step="0.01"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
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
          {givenBy === ME_VALUE && (
            <p className="text-xs text-muted-foreground">
              This also counts toward your own transaction history, since it&apos;s your money.
            </p>
          )}
          {givenBy === EXTERNAL_VALUE && (
            <p className="text-xs text-muted-foreground">
              Counts toward the trip total, but not toward anyone&apos;s split — use the note below to
              say who it was from (e.g. &quot;Dad&quot;).
            </p>
          )}
        </div>

        {type === "expense" && givenBy !== EXTERNAL_VALUE && participants.length > 0 && (
          <div className="flex flex-col gap-2">
            <Label>Split</Label>
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
              {(["equal", "custom"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setSplitMode(mode)}
                  className={cn(
                    "rounded-md py-1.5 text-sm font-medium transition-colors",
                    splitMode === mode ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
                  )}
                >
                  {mode === "equal" ? "Equally, everyone" : "Custom"}
                </button>
              ))}
            </div>
            {splitMode === "custom" && (
              <div className="flex flex-col gap-1.5 rounded-lg border border-border p-2">
                {splitPeople.map((p) => {
                  const included = splitIncluded.has(p.id);
                  return (
                    <div key={p.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={included}
                        onChange={() => toggleSplitPerson(p.id, Number(amount) || 0)}
                        className="h-4 w-4 shrink-0 rounded border-input"
                        aria-label={`Include ${p.name} in split`}
                      />
                      <span className={cn("flex-1 truncate text-sm", !included && "text-muted-foreground")}>
                        {p.name}
                      </span>
                      <Input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        disabled={!included}
                        className="w-24"
                        value={splitAmounts[p.id] ?? ""}
                        onChange={(e) => setSplitAmounts((prev) => ({ ...prev, [p.id]: e.target.value }))}
                      />
                    </div>
                  );
                })}
                <p
                  className={cn(
                    "pt-1 text-right text-xs",
                    Math.abs(splitSum - (Number(amount) || 0)) < 0.01
                      ? "text-muted-foreground"
                      : "text-rose-600 dark:text-rose-400",
                  )}
                >
                  {splitSum.toFixed(2)} of {amount || "0"}
                </p>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Label>Category</Label>
          <Select value={categoryId} onValueChange={(value) => setCategoryId(value ?? "")}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Optional">
                {(value: string) => {
                  const selected = filteredCategories.find((c) => c.id === value);
                  if (!selected) return "Optional";
                  return (
                    <span className="flex items-center gap-2">
                      {renderCategoryIcon(selected.icon, "h-4 w-4 text-muted-foreground")}
                      {selected.name}
                    </span>
                  );
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {filteredCategories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {renderCategoryIcon(c.icon, "h-4 w-4 text-muted-foreground")}
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <Label>Account</Label>
            <Select value={accountId} onValueChange={(value) => setAccountId(value ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Optional">
                  {(value: string) => accounts.find((a) => a.id === value)?.name ?? "Optional"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="event-expense-date">Date</Label>
            <Input
              id="event-expense-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="event-expense-note">Note (optional)</Label>
          <Input
            id="event-expense-note"
            placeholder="e.g. Hotel deposit"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <DialogFooter>
          <Button type="button" disabled={isPending} onClick={handleSave} className="w-full sm:w-auto">
            {isPending ? "Saving..." : isEditing ? "Save changes" : "Add"}
          </Button>
          {existing && (
            <ConfirmDialog
              title="Delete this transaction?"
              description="This can't be undone."
              onConfirm={() => deleteTransactionInlineAction(existing.id, eventId)}
              errorMessage="Couldn't delete this transaction. Please try again."
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
