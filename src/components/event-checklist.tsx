"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { cn } from "@/lib/utils";
import {
  createChecklistItemAction,
  toggleChecklistItemAction,
  deleteChecklistItemAction,
} from "@/app/(app)/events/actions";

export interface ChecklistItemData {
  id: string;
  text: string;
  is_done: boolean;
}

export function EventChecklist({ eventId, items }: { eventId: string; items: ChecklistItemData[] }) {
  const [newText, setNewText] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleAdd() {
    const trimmed = newText.trim();
    if (!trimmed) return;
    startTransition(async () => {
      try {
        await createChecklistItemAction(eventId, trimmed);
        setNewText("");
      } catch {
        toast.error("Couldn't add that item.");
      }
    });
  }

  function handleToggle(id: string, checked: boolean) {
    startTransition(async () => {
      try {
        await toggleChecklistItemAction(eventId, id, checked);
      } catch {
        toast.error("Couldn't update that item.");
      }
    });
  }

  const doneCount = items.filter((i) => i.is_done).length;

  return (
    <div className="flex flex-col gap-3">
      {items.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {doneCount} of {items.length} done
        </p>
      )}

      <div className="flex flex-col gap-1">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-2.5 rounded-lg px-1 py-1.5">
            <Checkbox
              checked={item.is_done}
              onCheckedChange={(checked) => handleToggle(item.id, checked === true)}
            />
            <p
              className={cn(
                "min-w-0 flex-1 truncate text-sm",
                item.is_done && "text-muted-foreground line-through",
              )}
            >
              {item.text}
            </p>
            <ConfirmDialog
              title={`Remove "${item.text}"?`}
              description="This can't be undone."
              onConfirm={() => deleteChecklistItemAction(eventId, item.id)}
              errorMessage="Couldn't remove that item. Please try again."
              trigger={
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  nativeButton={false}
                  render={
                    <span>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </span>
                  }
                />
              }
            />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Input
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="e.g. Book hotel, pack sunscreen..."
          className="h-8 flex-1"
        />
        <Button type="button" size="sm" disabled={isPending || !newText.trim()} onClick={handleAdd}>
          Add
        </Button>
      </div>
    </div>
  );
}
