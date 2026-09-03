"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { transactionSchema, type TransactionInput } from "@/lib/validation/transaction";
import {
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from "@/lib/services/transactions";
import { uploadReceipt, getReceiptUrl, deleteReceipt } from "@/lib/services/receipts";

// A transaction tagged to an event should return you to that event afterward
// (you were planning a trip, not browsing your whole transaction history) —
// falls back to the generic list when there's no event to go back to.
function destinationFor(eventId: string | null | undefined) {
  return eventId ? `/events/${eventId}` : "/transactions";
}

export async function createTransactionAction(input: TransactionInput) {
  const parsed = transactionSchema.parse(input);
  await createTransaction(parsed);
  revalidatePath("/");
  revalidatePath("/transactions");
  if (parsed.event_id) revalidatePath(`/events/${parsed.event_id}`);
  redirect(destinationFor(parsed.event_id));
}

export async function updateTransactionAction(id: string, input: TransactionInput) {
  const parsed = transactionSchema.parse(input);
  await updateTransaction(id, parsed);
  revalidatePath("/");
  revalidatePath("/transactions");
  if (parsed.event_id) revalidatePath(`/events/${parsed.event_id}`);
  redirect(destinationFor(parsed.event_id));
}

export async function deleteTransactionAction(id: string, eventId?: string | null) {
  await deleteTransaction(id);
  revalidatePath("/");
  revalidatePath("/transactions");
  if (eventId) revalidatePath(`/events/${eventId}`);
  redirect(destinationFor(eventId));
}

/** Same delete, but for a row that lives inline in a list (dashboard, history, an event's money list) — stays put instead of navigating away. */
export async function deleteTransactionInlineAction(id: string, eventId?: string | null) {
  await deleteTransaction(id);
  revalidatePath("/");
  revalidatePath("/transactions");
  if (eventId) revalidatePath(`/events/${eventId}`);
}

const MAX_RECEIPT_BYTES = 8 * 1024 * 1024;

export async function uploadReceiptAction(transactionId: string, formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("Choose a photo first");
  if (!file.type.startsWith("image/")) throw new Error("Only image files are supported");
  if (file.size > MAX_RECEIPT_BYTES) throw new Error("Photo must be under 8MB");

  const path = await uploadReceipt(transactionId, file);
  revalidatePath(`/transactions/${transactionId}/edit`);
  return path;
}

export async function getReceiptUrlAction(path: string) {
  return getReceiptUrl(path);
}

export async function deleteReceiptAction(transactionId: string, path: string) {
  await deleteReceipt(transactionId, path);
  revalidatePath(`/transactions/${transactionId}/edit`);
}
