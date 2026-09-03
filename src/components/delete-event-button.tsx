"use client";

import { Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";

export function DeleteEventButton({
  action,
  eventName,
}: {
  action: () => Promise<void>;
  eventName: string;
}) {
  return (
    <ConfirmDialog
      title={`Delete "${eventName}"?`}
      description="This removes its checklist, participants, and splits too. This can't be undone."
      onConfirm={action}
      errorMessage="Couldn't delete this trip. Please try again."
      trigger={
        <span
          className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
          aria-label="Delete trip"
        >
          <Trash2 className="h-4 w-4" />
        </span>
      }
    />
  );
}
