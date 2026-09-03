"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eventSchema, type EventInput } from "@/lib/validation/event";
import { checklistItemSchema } from "@/lib/validation/checklist";
import { itineraryItemSchema, type ItineraryItemInput } from "@/lib/validation/itinerary";
import {
  participantSchema,
  settlementSchema,
  eventExpenseSchema,
  scheduledItemSchema,
  type SettlementInput,
  type EventExpenseInput,
  type ScheduledItemInput,
} from "@/lib/validation/split";
import {
  createEvent,
  updateEvent,
  deleteEvent,
  createChecklistItem,
  toggleChecklistItem,
  deleteChecklistItem,
} from "@/lib/services/events";
import {
  createParticipant,
  renameParticipant,
  deleteParticipant,
  recordSettlement,
  createEventExpense,
  updateEventExpense,
} from "@/lib/services/splits";
import {
  createScheduledItem,
  updateScheduledItem,
  deleteScheduledItem,
} from "@/lib/services/scheduled-items";
import {
  createItineraryItem,
  updateItineraryItem,
  deleteItineraryItem,
  setEventSharing,
} from "@/lib/services/itinerary";

export async function createEventAction(input: EventInput) {
  const parsed = eventSchema.parse(input);
  await createEvent(parsed);
  revalidatePath("/events");
  redirect("/events");
}

export async function updateEventAction(id: string, input: EventInput) {
  const parsed = eventSchema.parse(input);
  await updateEvent(id, parsed);
  revalidatePath("/events");
  revalidatePath(`/events/${id}`);
  redirect(`/events/${id}`);
}

export async function deleteEventAction(id: string) {
  await deleteEvent(id);
  revalidatePath("/events");
  redirect("/events");
}

export async function createChecklistItemAction(eventId: string, text: string) {
  const parsed = checklistItemSchema.parse({ text });
  await createChecklistItem(eventId, parsed.text);
  revalidatePath(`/events/${eventId}`);
}

export async function toggleChecklistItemAction(eventId: string, id: string, isDone: boolean) {
  await toggleChecklistItem(id, isDone);
  revalidatePath(`/events/${eventId}`);
}

export async function deleteChecklistItemAction(eventId: string, id: string) {
  await deleteChecklistItem(id);
  revalidatePath(`/events/${eventId}`);
}

export async function createParticipantAction(eventId: string, name: string) {
  const parsed = participantSchema.parse({ name });
  await createParticipant(eventId, parsed.name);
  revalidatePath(`/events/${eventId}`);
}

export async function renameParticipantAction(eventId: string, id: string, name: string) {
  await renameParticipant(id, name);
  revalidatePath(`/events/${eventId}`);
}

export async function deleteParticipantAction(eventId: string, id: string) {
  await deleteParticipant(id);
  revalidatePath(`/events/${eventId}`);
}

export async function createEventExpenseAction(eventId: string, input: EventExpenseInput) {
  const parsed = eventExpenseSchema.parse(input);
  await createEventExpense(eventId, parsed);
  revalidatePath(`/events/${eventId}`);
  if (parsed.paid_by_participant_id === null) {
    revalidatePath("/");
    revalidatePath("/transactions");
  }
}

export async function updateEventExpenseAction(eventId: string, id: string, input: EventExpenseInput) {
  const parsed = eventExpenseSchema.parse(input);
  await updateEventExpense(id, parsed);
  revalidatePath(`/events/${eventId}`);
  revalidatePath("/");
  revalidatePath("/transactions");
}

export async function createScheduledItemAction(eventId: string, input: ScheduledItemInput) {
  const parsed = scheduledItemSchema.parse(input);
  await createScheduledItem(eventId, parsed);
  revalidatePath(`/events/${eventId}`);
}

export async function updateScheduledItemAction(eventId: string, id: string, input: ScheduledItemInput) {
  const parsed = scheduledItemSchema.parse(input);
  await updateScheduledItem(id, parsed);
  revalidatePath(`/events/${eventId}`);
}

export async function deleteScheduledItemAction(eventId: string, id: string) {
  await deleteScheduledItem(id);
  revalidatePath(`/events/${eventId}`);
}

export async function recordSettlementAction(
  eventId: string,
  names: { from: string; to: string },
  input: SettlementInput,
) {
  const parsed = settlementSchema.parse(input);
  await recordSettlement(eventId, parsed, names);
  revalidatePath(`/events/${eventId}`);
  if (parsed.from_participant_id === null || parsed.to_participant_id === null) {
    revalidatePath("/");
    revalidatePath("/transactions");
  }
}

export async function createItineraryItemAction(eventId: string, input: ItineraryItemInput) {
  const parsed = itineraryItemSchema.parse(input);
  await createItineraryItem(eventId, parsed);
  revalidatePath(`/events/${eventId}`);
}

export async function updateItineraryItemAction(eventId: string, id: string, input: ItineraryItemInput) {
  const parsed = itineraryItemSchema.parse(input);
  await updateItineraryItem(id, parsed);
  revalidatePath(`/events/${eventId}`);
}

export async function deleteItineraryItemAction(eventId: string, id: string) {
  await deleteItineraryItem(id);
  revalidatePath(`/events/${eventId}`);
}

export async function setEventSharingAction(eventId: string, enabled: boolean) {
  const token = await setEventSharing(eventId, enabled);
  revalidatePath(`/events/${eventId}`);
  return token;
}
