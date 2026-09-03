import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EventForm } from "@/components/event-form";
import { createEventAction } from "../actions";

export default function NewEventPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          nativeButton={false}
          render={
            <Link href="/events">
              <ChevronLeft className="h-5 w-5" />
            </Link>
          }
        />
        <h1 className="text-lg font-semibold">New event</h1>
      </div>

      <EventForm onSubmit={createEventAction} />
    </div>
  );
}
