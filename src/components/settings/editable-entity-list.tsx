"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";

export interface EditableEntity {
  id: string;
  label: string;
  sublabel?: string;
}

export function EditableEntityList({
  items,
  createPlaceholder,
  onCreate,
  onRename,
  onDelete,
}: {
  items: EditableEntity[];
  createPlaceholder: string;
  onCreate: (name: string) => Promise<void>;
  onRename: (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [newValue, setNewValue] = useState("");
  const [isPending, startTransition] = useTransition();

  function startEdit(item: EditableEntity) {
    setEditingId(item.id);
    setEditValue(item.label);
  }

  function saveEdit(id: string) {
    const trimmed = editValue.trim();
    if (!trimmed) return;
    startTransition(async () => {
      try {
        await onRename(id, trimmed);
        setEditingId(null);
      } catch {
        toast.error("Couldn't save that change.");
      }
    });
  }

  function handleCreate() {
    const trimmed = newValue.trim();
    if (!trimmed) return;
    startTransition(async () => {
      try {
        await onCreate(trimmed);
        setNewValue("");
      } catch {
        toast.error("Couldn't add that.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-1">
      {items.map((item) => (
        <div key={item.id} className="flex items-center gap-2 rounded-lg px-1 py-1.5">
          {editingId === item.id ? (
            <>
              <Input
                autoFocus
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveEdit(item.id);
                  if (e.key === "Escape") setEditingId(null);
                }}
                className="h-8 flex-1"
              />
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                disabled={isPending}
                onClick={() => saveEdit(item.id)}
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button type="button" size="icon-sm" variant="ghost" onClick={() => setEditingId(null)}>
                <X className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{item.label}</p>
                {item.sublabel && <p className="text-xs text-muted-foreground">{item.sublabel}</p>}
              </div>
              <Button type="button" size="icon-sm" variant="ghost" onClick={() => startEdit(item)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <ConfirmDialog
                title={`Delete "${item.label}"?`}
                description="This can't be undone."
                onConfirm={() => onDelete(item.id)}
                errorMessage="Couldn't delete that. Please try again."
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
            </>
          )}
        </div>
      ))}

      <div className="flex items-center gap-2 px-1 pt-1">
        <Input
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          placeholder={createPlaceholder}
          className="h-8 flex-1"
        />
        <Button type="button" size="icon-sm" disabled={isPending || !newValue.trim()} onClick={handleCreate}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
