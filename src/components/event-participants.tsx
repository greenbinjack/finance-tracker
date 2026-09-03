"use client";

import { User } from "lucide-react";
import { EditableEntityList } from "@/components/settings/editable-entity-list";
import {
  createParticipantAction,
  renameParticipantAction,
  deleteParticipantAction,
} from "@/app/(app)/events/actions";

export interface ParticipantItem {
  id: string;
  name: string;
}

export function EventParticipants({ eventId, participants }: { eventId: string; participants: ParticipantItem[] }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 rounded-lg px-1 py-1.5 text-sm">
        <User className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="flex-1">Myself</span>
        <span className="text-xs text-muted-foreground">Always included</span>
      </div>

      <EditableEntityList
        items={participants.map((p) => ({ id: p.id, label: p.name }))}
        createPlaceholder="e.g. Rafi"
        onCreate={(name) => createParticipantAction(eventId, name)}
        onRename={(id, name) => renameParticipantAction(eventId, id, name)}
        onDelete={(id) => deleteParticipantAction(eventId, id)}
      />
    </div>
  );
}
