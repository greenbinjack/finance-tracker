"use client";

import { useState, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";
import { investmentSchema, type InvestmentInput } from "@/lib/validation/investment";
import { isRedirectError } from "@/lib/is-redirect-error";
import { humanizeInvestmentType } from "@/lib/domain/investment";
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
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Plus, Trash2 } from "lucide-react";

type InvestmentFormValues = z.input<typeof investmentSchema>;

const NEW_TYPE_VALUE = "__new__";

export function InvestmentForm({
  types,
  defaultValues,
  onSubmit,
  onDelete,
}: {
  types: string[];
  defaultValues?: Partial<InvestmentInput>;
  onSubmit: (input: InvestmentInput) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();
  const [pendingData, setPendingData] = useState<InvestmentInput | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [typeList, setTypeList] = useState(types);
  const [newTypeOpen, setNewTypeOpen] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const [typeBeforeNewDialog, setTypeBeforeNewDialog] = useState("");

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<InvestmentFormValues, unknown, InvestmentInput>({
    resolver: zodResolver(investmentSchema),
    defaultValues: {
      type: types[0] ?? "Stocks",
      date_invested: todayLocalDate(),
      current_value: 0,
      ...defaultValues,
      ...(defaultValues?.type ? { type: humanizeInvestmentType(defaultValues.type) } : {}),
    },
  });

  const submit = handleSubmit((data) => {
    if (onDelete) {
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

  function handleCreateType() {
    const name = newTypeName.trim();
    if (!name) return;
    setTypeList((prev) => (prev.includes(name) ? prev : [...prev, name]));
    setValue("type", name, { shouldValidate: true, shouldDirty: true });
    setNewTypeOpen(false);
    setNewTypeName("");
  }

  function handleNewTypeDialogChange(open: boolean) {
    setNewTypeOpen(open);
    if (!open) {
      setValue("type", typeBeforeNewDialog, { shouldValidate: true });
      setNewTypeName("");
    }
  }

  return (
    <>
      <form onSubmit={submit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" placeholder="e.g. Grameenphone shares" {...register("name")} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>

        <div className="flex flex-col gap-2">
          <Label>Type</Label>
          <Controller
            control={control}
            name="type"
            render={({ field }) => (
              <Select
                value={field.value ?? ""}
                onValueChange={(value) => {
                  if (value === NEW_TYPE_VALUE) {
                    setTypeBeforeNewDialog(field.value ?? "");
                    setNewTypeOpen(true);
                  }
                  field.onChange(value);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a type">
                    {(value: string) => value || "Select a type"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {typeList.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                  <SelectSeparator />
                  <SelectItem value={NEW_TYPE_VALUE}>
                    <Plus className="h-4 w-4" />
                    Add new type
                  </SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="amount_invested">Amount invested</Label>
            <Input
              id="amount_invested"
              type="number"
              inputMode="decimal"
              step="0.01"
              placeholder="0.00"
              {...register("amount_invested")}
            />
            {errors.amount_invested && (
              <p className="text-xs text-destructive">{errors.amount_invested.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="current_value">Current value</Label>
            <Input
              id="current_value"
              type="number"
              inputMode="decimal"
              step="0.01"
              placeholder="0.00"
              {...register("current_value")}
            />
            {errors.current_value && (
              <p className="text-xs text-destructive">{errors.current_value.message}</p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="date_invested">Date invested</Label>
          <Input id="date_invested" type="date" {...register("date_invested")} />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="notes">Notes (optional)</Label>
          <Input id="notes" placeholder="e.g. Bought via DSE broker" {...register("notes")} />
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? "Saving..." : onDelete ? "Save changes" : "Add investment"}
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
              title="Delete this investment?"
              description="This can't be undone."
              onConfirm={onDelete}
              errorMessage="Couldn't delete this investment. Please try again."
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

      <Dialog open={newTypeOpen} onOpenChange={handleNewTypeDialogChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New investment type</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="new-type-name">Name</Label>
            <Input
              id="new-type-name"
              value={newTypeName}
              onChange={(e) => setNewTypeName(e.target.value)}
              placeholder="e.g. Real Estate"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleCreateType();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button type="button" disabled={!newTypeName.trim()} onClick={handleCreateType}>
              Add type
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
