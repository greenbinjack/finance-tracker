import { createClient } from "@/lib/supabase/server";

const BUCKET = "receipts";
const SIGNED_URL_TTL_SECONDS = 60 * 10;

/** Uploads (or replaces) the receipt photo for a transaction, storing it at <user_id>/<transaction_id>.<ext> in the private "receipts" bucket. */
export async function uploadReceipt(transactionId: string, file: File): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const ext = file.name.includes(".") ? file.name.split(".").pop() : "jpg";
  const path = `${user.id}/${transactionId}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type || "image/jpeg" });
  // Surfaces as a friendly message rather than the raw Supabase error (e.g.
  // "Bucket not found" before the receipts migration has been run) — a
  // technical detail the user can't act on anyway.
  if (uploadError) throw new Error("Couldn't upload that photo. Please try again.");

  const { error: updateError } = await supabase
    .from("transactions")
    .update({ receipt_path: path })
    .eq("id", transactionId);
  if (updateError) throw new Error("Couldn't save the receipt. Please try again.");

  return path;
}

/** A short-lived signed URL — the bucket is private, so this is the only way to ever view a receipt. */
export async function getReceiptUrl(path: string): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error) throw new Error("Couldn't load the receipt. Please try again.");
  return data.signedUrl;
}

export async function deleteReceipt(transactionId: string, path: string) {
  const supabase = await createClient();
  const { error: removeError } = await supabase.storage.from(BUCKET).remove([path]);
  if (removeError) throw new Error("Couldn't remove the receipt. Please try again.");

  const { error: updateError } = await supabase
    .from("transactions")
    .update({ receipt_path: null })
    .eq("id", transactionId);
  if (updateError) throw new Error("Couldn't remove the receipt. Please try again.");
}
