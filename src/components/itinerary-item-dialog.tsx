"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
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
import { isRedirectError } from "@/lib/is-redirect-error";
import {
  createItineraryItemAction,
  updateItineraryItemAction,
  deleteItineraryItemAction,
} from "@/app/(app)/events/actions";
import type { ItineraryItemType } from "@/lib/supabase/database.types";

export const ITINERARY_TYPE_LABELS: Record<ItineraryItemType, string> = {
  activity: "Activity",
  flight: "Flight",
  hotel: "Hotel",
  transport: "Transport",
  other: "Other",
};

export interface ItineraryItemRecord {
  id: string;
  day_date: string;
  time: string | null;
  title: string;
  notes: string | null;
  location: string | null;
  item_type: ItineraryItemType;
  confirmation_number: string | null;
}

export function ItineraryItemDialog({
  eventId,
  trigger,
  existing,
  defaultDate,
}: {
  eventId: string;
  trigger: React.ReactNode;
  existing?: ItineraryItemRecord;
  defaultDate?: string;
}) {
  const isEditing = Boolean(existing);
  const [open, setOpen] = useState(false);
  const [dayDate, setDayDate] = useState(existing?.day_date ?? defaultDate ?? new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState(existing?.time ?? "");
  const [title, setTitle] = useState(existing?.title ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [location, setLocation] = useState(existing?.location ?? "");
  const [itemType, setItemType] = useState<ItineraryItemType>(existing?.item_type ?? "activity");
  const [confirmationNumber, setConfirmationNumber] = useState(existing?.confirmation_number ?? "");
  const [isPending, startTransition] = useTransition();

  function resetToExisting() {
    setDayDate(existing?.day_date ?? defaultDate ?? new Date().toISOString().slice(0, 10));
    setTime(existing?.time ?? "");
    setTitle(existing?.title ?? "");
    setNotes(existing?.notes ?? "");
    setLocation(existing?.location ?? "");
    setItemType(existing?.item_type ?? "activity");
    setConfirmationNumber(existing?.confirmation_number ?? "");
  }

  function handleSave() {
    if (!title.trim()) {
      toast.error("Enter a title");
      return;
    }
    const input = {
      day_date: dayDate,
      time: time || undefined,
      title: title.trim(),
      notes: notes || undefined,
      location: location || undefined,
      item_type: itemType,
      confirmation_number: confirmationNumber || undefined,
    };

    startTransition(async () => {
      try {
        if (existing) {
          await updateItineraryItemAction(eventId, existing.id, input);
          toast.success("Changes saved");
        } else {
          await createItineraryItemAction(eventId, input);
          toast.success("Added to itinerary");
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
          <DialogTitle>{isEditing ? "Edit itinerary item" : "Add to itinerary"}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="itinerary-date">Date</Label>
            <Input id="itinerary-date" type="date" value={dayDate} onChange={(e) => setDayDate(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="itinerary-time">Time (optional)</Label>
            <Input id="itinerary-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="itinerary-title">Title</Label>
          <Input
            id="itinerary-title"
            placeholder="e.g. Check into hotel"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label>Type</Label>
          <Select value={itemType} onValueChange={(v) => setItemType((v ?? "activity") as ItineraryItemType)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Activity">
                {(value: string) => ITINERARY_TYPE_LABELS[value as ItineraryItemType] ?? "Activity"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(ITINERARY_TYPE_LABELS) as ItineraryItemType[]).map((t) => (
                <SelectItem key={t} value={t}>
                  {ITINERARY_TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {(itemType === "flight" || itemType === "hotel" || itemType === "transport") && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="itinerary-confirmation">Confirmation number (optional)</Label>
            <Input
              id="itinerary-confirmation"
              placeholder="e.g. PNR ABC123"
              value={confirmationNumber}
              onChange={(e) => setConfirmationNumber(e.target.value)}
            />
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Label htmlFor="itinerary-location">Location (optional)</Label>
          <Input
            id="itinerary-location"
            placeholder="e.g. Cox's Bazar Sea Beach"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="itinerary-notes">Notes (optional)</Label>
          <Input
            id="itinerary-notes"
            placeholder="e.g. Confirmation #1234"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <DialogFooter>
          <Button type="button" disabled={isPending} onClick={handleSave} className="w-full sm:w-auto">
            {isPending ? "Saving..." : isEditing ? "Save changes" : "Add"}
          </Button>
          {existing && (
            <ConfirmDialog
              title="Remove this itinerary item?"
              description="This can't be undone."
              onConfirm={() => deleteItineraryItemAction(eventId, existing.id)}
              errorMessage="Couldn't remove that. Please try again."
              trigger={
                <Button
                  type="button"
                  variant="destructive"
                  nativeButton={false}
                  className="w-full sm:w-auto"
                  render={
                    <span>
                      <Trash2 className="h-4 w-4" />
                      Remove
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
