"use client";

import { useState, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { toast } from "sonner";
import type { z } from "zod";
import { transactionSchema, type TransactionInput } from "@/lib/validation/transaction";
import { renderCategoryIcon } from "@/lib/category-icons";
import { todayLocalDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { isRedirectError } from "@/lib/is-redirect-error";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Plus, Trash2, MapPin } from "lucide-react";
import { createCategoryAction } from "@/app/(app)/actions";

type TransactionFormValues = z.input<typeof transactionSchema>;

const NEW_CATEGORY_VALUE = "__new__";

export interface SelectOption {
  id: string;
  name: string;
}

interface CategoryOption {
  id: string;
  name: string;
  type: "expense" | "income";
  icon?: string | null;
}

export function TransactionForm({
  categories,
  accounts,
  events,
  defaultValues,
  lockedEvent,
  onSubmit,
  onDelete,
}: {
  categories: CategoryOption[];
  accounts: SelectOption[];
  events: SelectOption[];
  defaultValues?: Partial<TransactionInput>;
  /** When set, this transaction is guaranteed tied to the event — the picker is replaced with a fixed indicator instead of an editable field. */
  lockedEvent?: SelectOption;
  onSubmit: (input: TransactionInput) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();
  const [pendingData, setPendingData] = useState<TransactionInput | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [categoryList, setCategoryList] = useState<CategoryOption[]>(categories);
  const [isCreatingCategory, startCreateCategoryTransition] = useTransition();
  const [newCategoryOpen, setNewCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [categoryIdBeforeNewDialog, setCategoryIdBeforeNewDialog] = useState("");

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TransactionFormValues, unknown, TransactionInput>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: "expense",
      occurred_on: todayLocalDate(),
      ...defaultValues,
      ...(lockedEvent ? { event_id: lockedEvent.id } : {}),
    },
  });

  const type = watch("type");
  const filteredCategories = categoryList.filter((c) => c.type === type);

  const submit = handleSubmit((data) => {
    if (onDelete) {
      // Editing an existing transaction — confirm before actually submitting.
      setPendingData(data);
      setConfirmOpen(true);
      return;
    }
    startTransition(async () => {
      try {
        await onSubmit(data);
      } catch (error) {
        if (isRedirectError(error)) throw error;
        toast.error("Something went wrong. Please try again.");
      }
    });
  });

  async function performConfirmedSubmit() {
    if (!pendingData) return;
    await onSubmit(pendingData);
  }

  function handleCreateCategory() {
    const name = newCategoryName.trim();
    if (!name) return;

    startCreateCategoryTransition(async () => {
      try {
        const created = await createCategoryAction(name, type);
        setCategoryList((prev) => [...prev, created]);
        setValue("category_id", created.id, { shouldValidate: true, shouldDirty: true });
        setNewCategoryOpen(false);
        setNewCategoryName("");
        toast.success(`Added "${created.name}" category`);
      } catch {
        toast.error("Couldn't create that category. Please try again.");
      }
    });
  }

  function handleNewCategoryDialogChange(open: boolean) {
    setNewCategoryOpen(open);
    if (!open) {
      // Cancelled without creating — restore whatever category was selected before.
      setValue("category_id", categoryIdBeforeNewDialog, { shouldValidate: true });
      setNewCategoryName("");
    }
  }

  return (
    <>
    <form onSubmit={submit} className="flex flex-col gap-5">
      <Controller
        control={control}
        name="type"
        render={({ field }) => (
          <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
            {(["expense", "income"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => field.onChange(t)}
                className={cn(
                  "relative rounded-md py-2 text-sm font-medium capitalize transition-colors",
                  field.value === t ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {field.value === t && (
                  <motion.span
                    layoutId="tx-type-pill"
                    className={cn(
                      "absolute inset-0 rounded-md",
                      t === "income" ? "bg-emerald-500/15" : "bg-rose-500/15",
                    )}
                    transition={{ duration: 0.2 }}
                  />
                )}
                <span className="relative">{t}</span>
              </button>
            ))}
          </div>
        )}
      />

      <div className="flex flex-col gap-2">
        <Label htmlFor="amount">Amount</Label>
        <Input
          id="amount"
          type="number"
          inputMode="decimal"
          step="0.01"
          placeholder="0.00"
          className="text-lg"
          {...register("amount")}
        />
        {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <Label>Category</Label>
        <Controller
          control={control}
          name="category_id"
          render={({ field }) => (
            <Select
              value={field.value ?? ""}
              onValueChange={(value) => {
                if (value === NEW_CATEGORY_VALUE) {
                  setCategoryIdBeforeNewDialog(field.value ?? "");
                  setNewCategoryOpen(true);
                }
                field.onChange(value);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a category">
                  {(value: string) => {
                    const selected = categoryList.find((c) => c.id === value);
                    if (!selected) return "Select a category";
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
                <SelectSeparator />
                <SelectItem value={NEW_CATEGORY_VALUE}>
                  <Plus className="h-4 w-4" />
                  Add new category
                </SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <Label>Account</Label>
          <Controller
            control={control}
            name="account_id"
            render={({ field }) => (
              <Select value={field.value ?? ""} onValueChange={field.onChange}>
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
            )}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="occurred_on">Date</Label>
          <Input id="occurred_on" type="date" {...register("occurred_on")} />
        </div>
      </div>

      {lockedEvent ? (
        <div className="flex flex-col gap-2">
          <Label>Event / trip</Label>
          <div className="flex items-center gap-2 rounded-md border border-dashed bg-muted/50 px-3 py-2 text-sm">
            <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span>
              Tied to <span className="font-medium">{lockedEvent.name}</span>
            </span>
          </div>
          {/* event_id is fixed via defaultValues above — no field is rendered, so nothing can detach it */}
        </div>
      ) : (
        events.length > 0 && (
          <div className="flex flex-col gap-2">
            <Label>Event / trip (optional)</Label>
            <Controller
              control={control}
              name="event_id"
              render={({ field }) => (
                <Select value={field.value ?? ""} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="None">
                      {(value: string) => events.find((e) => e.id === value)?.name ?? "None"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {events.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        )
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="note">Note (optional)</Label>
        <Input id="note" placeholder="e.g. Lunch with friends" {...register("note")} />
      </div>

      <div className="flex flex-col gap-2 pt-2">
        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? "Saving..." : onDelete ? "Save changes" : "Add transaction"}
        </Button>
        {onDelete && (
          <ConfirmDialog
            title="Save these changes?"
            description="Review your changes before confirming."
            confirmLabel="Save changes"
            pendingLabel="Saving..."
            variant="default"
            onConfirm={performConfirmedSubmit}
            errorMessage="Couldn't save those changes. Please try again."
            open={confirmOpen}
            onOpenChange={setConfirmOpen}
          />
        )}
        {onDelete && (
          <ConfirmDialog
            title="Delete this transaction?"
            description="This can't be undone."
            onConfirm={onDelete}
            errorMessage="Couldn't delete this transaction. Please try again."
            trigger={
              <Button
                type="button"
                variant="destructive"
                nativeButton={false}
                className="w-full"
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
      </div>
    </form>

    <Dialog open={newCategoryOpen} onOpenChange={handleNewCategoryDialogChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New {type} category</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Label htmlFor="new-category-name">Name</Label>
          <Input
            id="new-category-name"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="e.g. Subscriptions"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleCreateCategory();
              }
            }}
          />
        </div>
        <DialogFooter>
          <Button
            type="button"
            disabled={isCreatingCategory || !newCategoryName.trim()}
            onClick={handleCreateCategory}
          >
            {isCreatingCategory ? "Adding..." : "Add category"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
