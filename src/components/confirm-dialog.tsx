"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { isRedirectError } from "@/lib/is-redirect-error";

/**
 * Reusable "are you sure?" dialog — wrap any destructive action's trigger
 * with this instead of firing it directly. Can also run without a `trigger`
 * (pass `open`/`onOpenChange` instead) for flows that open it programmatically
 * — e.g. after a form validates, before actually submitting.
 */
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = "Delete",
  pendingLabel,
  variant = "destructive",
  onConfirm,
  errorMessage = "Couldn't complete that action. Please try again.",
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: {
  trigger?: React.ReactNode;
  title: string;
  description: string;
  confirmLabel?: string;
  pendingLabel?: string;
  variant?: "destructive" | "default";
  onConfirm: () => Promise<void>;
  errorMessage?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = setControlledOpen ?? setInternalOpen;
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      try {
        await onConfirm();
        setOpen(false);
      } catch (error) {
        if (isRedirectError(error)) throw error;
        toast.error(errorMessage);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger className="inline-flex">{trigger}</DialogTrigger>}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{description}</p>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button type="button" variant={variant} onClick={handleConfirm} disabled={isPending}>
            {isPending ? (pendingLabel ?? "Deleting...") : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
