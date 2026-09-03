"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";
import { eventSchema, type EventInput } from "@/lib/validation/event";
import { isRedirectError } from "@/lib/is-redirect-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Trash2 } from "lucide-react";

type EventFormValues = z.input<typeof eventSchema>;

export function EventForm({
  defaultValues,
  onSubmit,
  onDelete,
}: {
  defaultValues?: Partial<EventInput>;
  onSubmit: (input: EventInput) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();
  const [pendingData, setPendingData] = useState<EventInput | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EventFormValues, unknown, EventInput>({
    resolver: zodResolver(eventSchema),
    defaultValues,
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

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" placeholder="e.g. Cox's Bazar trip" {...register("name")} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="budget_amount">Budget (optional)</Label>
        <Input
          id="budget_amount"
          type="number"
          inputMode="decimal"
          step="0.01"
          placeholder="0.00"
          {...register("budget_amount")}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="start_date">Start date</Label>
          <Input id="start_date" type="date" {...register("start_date")} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="end_date">End date</Label>
          <Input id="end_date" type="date" {...register("end_date")} />
          {errors.end_date && <p className="text-xs text-destructive">{errors.end_date.message}</p>}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Input id="notes" placeholder="e.g. With family" {...register("notes")} />
      </div>

      <div className="flex flex-col gap-2 pt-2">
        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? "Saving..." : onDelete ? "Save changes" : "Create event"}
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
            title="Delete this trip?"
            description="This removes its checklist, participants, and splits too. This can't be undone."
            onConfirm={onDelete}
            errorMessage="Couldn't delete this trip. Please try again."
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
  );
}
