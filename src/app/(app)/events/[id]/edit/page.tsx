import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EventForm } from "@/components/event-form";
import { getEventWithSpend } from "@/lib/services/events";
import { updateEventAction, deleteEventAction } from "../../actions";

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getEventWithSpend(id).catch(() => null);

  if (!result) notFound();
  const { event } = result;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          nativeButton={false}
          render={
            <Link href={`/events/${id}`}>
              <ChevronLeft className="h-5 w-5" />
            </Link>
          }
        />
        <h1 className="text-lg font-semibold">Edit event</h1>
      </div>

      <EventForm
        defaultValues={{
          name: event.name,
          budget_amount: event.budget_amount ?? undefined,
          start_date: event.start_date ?? undefined,
          end_date: event.end_date ?? undefined,
          notes: event.notes ?? undefined,
        }}
        onSubmit={updateEventAction.bind(null, id)}
        onDelete={deleteEventAction.bind(null, id)}
      />
    </div>
  );
}
