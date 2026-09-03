import { BackButton } from "@/components/back-button";
import { EventForm } from "@/components/event-form";
import { createEventAction } from "../actions";

export default function NewEventPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <BackButton />
        <h1 className="text-lg font-semibold">New event</h1>
      </div>

      <EventForm onSubmit={createEventAction} />
    </div>
  );
}
