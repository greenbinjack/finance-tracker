import Link from "next/link";
import { Plus, CalendarRange } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/back-button";
import { EventRow } from "@/components/event-row";
import { listEventsWithSpend } from "@/lib/services/events";
import { getProfile } from "@/lib/services/profile";

export default async function EventsPage() {
  const [profile, events] = await Promise.all([getProfile(), listEventsWithSpend()]);
  const currency = profile?.currency ?? "BDT";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <BackButton />
        <h1 className="flex-1 text-2xl font-semibold tracking-tight">Events &amp; trips</h1>
        <Button
          size="sm"
          nativeButton={false}
          render={
            <Link href="/events/new">
              <Plus className="h-4 w-4" />
              Add
            </Link>
          }
        />
      </div>

      <Card>
        <CardContent className="flex flex-col gap-1">
          {events.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <CalendarRange className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No events yet — tap Add to budget a trip or gathering.
              </p>
            </div>
          ) : (
            events.map((event) => <EventRow key={event.id} event={event} currency={currency} />)
          )}
        </CardContent>
      </Card>
    </div>
  );
}
