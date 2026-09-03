import { notFound } from "next/navigation";
import { Wallet, CalendarRange, CheckSquare, Users, MapPin } from "lucide-react";
import { getSharedTrip } from "@/lib/services/itinerary";
import { formatDate } from "@/lib/format";
import { mapSearchUrl } from "@/lib/map-link";

export default async function SharedTripPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = await getSharedTrip(token).catch(() => null);

  if (!data || !data.event) notFound();

  const { event, itinerary, checklist, participants } = data;

  const byDay = new Map<string, typeof itinerary>();
  for (const item of itinerary) {
    const list = byDay.get(item.day_date) ?? [];
    list.push(item);
    byDay.set(item.day_date, list);
  }
  const days = Array.from(byDay.keys()).sort();

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col gap-5 p-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Wallet className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{event.name}</h1>
        {(event.start_date || event.end_date) && (
          <p className="text-sm text-muted-foreground">
            {event.start_date && formatDate(event.start_date)}
            {event.start_date && event.end_date && " – "}
            {event.end_date && formatDate(event.end_date)}
          </p>
        )}
      </div>

      {event.notes && <p className="text-center text-sm text-muted-foreground">{event.notes}</p>}

      {participants.length > 0 && (
        <div className="flex flex-col gap-2 rounded-lg border border-border p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Users className="h-4 w-4" />
            Who&apos;s going
          </div>
          <p className="text-sm text-muted-foreground">{participants.map((p) => p.name).join(", ")}</p>
        </div>
      )}

      <div className="flex flex-col gap-2 rounded-lg border border-border p-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <CalendarRange className="h-4 w-4" />
          Itinerary
        </div>
        {days.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing planned yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {days.map((day) => (
              <div key={day} className="flex flex-col gap-1">
                <p className="text-xs font-medium text-muted-foreground">{formatDate(day)}</p>
                {byDay.get(day)!.map((item) => (
                  <div key={item.id} className="flex items-start gap-3 py-1">
                    {item.time && <span className="w-14 shrink-0 text-xs tabular-nums text-muted-foreground">{item.time}</span>}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{item.title}</p>
                      {item.notes && <p className="text-xs text-muted-foreground">{item.notes}</p>}
                    </div>
                    {item.location && (
                      <a
                        href={mapSearchUrl(item.location)}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`View ${item.title} on map`}
                        className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                      >
                        <MapPin className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {checklist.length > 0 && (
        <div className="flex flex-col gap-2 rounded-lg border border-border p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <CheckSquare className="h-4 w-4" />
            Checklist
          </div>
          <div className="flex flex-col gap-1">
            {checklist.map((item, i) => (
              <p key={i} className={item.is_done ? "text-sm text-muted-foreground line-through" : "text-sm"}>
                {item.text}
              </p>
            ))}
          </div>
        </div>
      )}

      <p className="text-center text-xs text-muted-foreground">Shared from Finance Tracker</p>
    </div>
  );
}
