import { Plus, Pencil, MapPin, Plane, BedDouble, Car, Sparkles } from "lucide-react";
import { ItineraryItemDialog, type ItineraryItemRecord } from "@/components/itinerary-item-dialog";
import { formatDate } from "@/lib/format";
import { mapSearchUrl } from "@/lib/map-link";
import type { ItineraryItemType } from "@/lib/supabase/database.types";

const ITINERARY_TYPE_ICONS: Record<ItineraryItemType, typeof Plane> = {
  activity: Sparkles,
  flight: Plane,
  hotel: BedDouble,
  transport: Car,
  other: Sparkles,
};

export function ItineraryList({ eventId, items }: { eventId: string; items: ItineraryItemRecord[] }) {
  const byDay = new Map<string, ItineraryItemRecord[]>();
  for (const item of items) {
    const list = byDay.get(item.day_date) ?? [];
    list.push(item);
    byDay.set(item.day_date, list);
  }
  const days = Array.from(byDay.keys()).sort();

  return (
    <div className="flex flex-col gap-3">
      {items.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          Nothing planned yet — add stops, activities, or bookings.
        </p>
      ) : (
        days.map((day) => (
          <div key={day} className="flex flex-col gap-1">
            <p className="px-2 text-xs font-medium text-muted-foreground">{formatDate(day)}</p>
            {byDay.get(day)!.map((item) => {
              const TypeIcon = ITINERARY_TYPE_ICONS[item.item_type];
              return (
              <div key={item.id} className="flex items-center gap-1 rounded-lg transition-colors hover:bg-muted/60">
                <ItineraryItemDialog
                  eventId={eventId}
                  existing={item}
                  trigger={
                    <div className="flex w-full items-center gap-3 px-2 py-2.5 text-left">
                      {item.time && (
                        <span className="w-14 shrink-0 text-xs tabular-nums text-muted-foreground">{item.time}</span>
                      )}
                      <TypeIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{item.title}</p>
                        {(item.location || item.notes || item.confirmation_number) && (
                          <p className="truncate text-xs text-muted-foreground">
                            {item.location ? `📍 ${item.location}` : ""}
                            {item.location && (item.notes || item.confirmation_number) ? " · " : ""}
                            {item.confirmation_number ? `#${item.confirmation_number}` : ""}
                            {item.confirmation_number && item.notes ? " · " : ""}
                            {item.notes ?? ""}
                          </p>
                        )}
                      </div>
                      <Pencil className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    </div>
                  }
                />
                {item.location && (
                  <a
                    href={mapSearchUrl(item.location)}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`View ${item.title} on map`}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground mr-1"
                  >
                    <MapPin className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
              );
            })}
          </div>
        ))
      )}

      <ItineraryItemDialog
        eventId={eventId}
        trigger={
          <span className="mt-1 inline-flex cursor-pointer items-center gap-1.5 self-start rounded-lg px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <Plus className="h-4 w-4" />
            Add to itinerary
          </span>
        }
      />
    </div>
  );
}
