"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Paperclip, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  uploadReceiptAction,
  getReceiptUrlAction,
  deleteReceiptAction,
} from "@/app/(app)/transactions/actions";

export function ReceiptAttachment({
  transactionId,
  receiptPath,
}: {
  transactionId: string;
  receiptPath: string | null;
}) {
  const [path, setPath] = useState(receiptPath);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.set("file", file);

    startTransition(async () => {
      try {
        const uploadedPath = await uploadReceiptAction(transactionId, formData);
        setPath(uploadedPath);
        setPreviewUrl(null);
        toast.success("Receipt attached");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't upload that photo. Please try again.");
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    });
  }

  function handleView() {
    if (!path) return;
    startTransition(async () => {
      try {
        const url = await getReceiptUrlAction(path);
        setPreviewUrl(url);
      } catch {
        toast.error("Couldn't load the receipt. Please try again.");
      }
    });
  }

  async function handleDelete() {
    if (!path) return;
    await deleteReceiptAction(transactionId, path);
    setPath(null);
    setPreviewUrl(null);
  }

  const attached = Boolean(path);

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">Receipt</p>
      {attached ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={handleView}
              nativeButton={false}
              render={
                <span>
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                  View receipt
                </span>
              }
            />
            <ConfirmDialog
              title="Remove this receipt?"
              description="This can't be undone."
              onConfirm={handleDelete}
              errorMessage="Couldn't remove the receipt. Please try again."
              trigger={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  nativeButton={false}
                  render={
                    <span>
                      <X className="h-3.5 w-3.5" />
                    </span>
                  }
                />
              }
            />
          </div>
          {previewUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- a short-lived signed URL, not a static asset to optimize
            <img src={previewUrl} alt="Receipt" className="max-h-64 rounded-lg border border-border object-contain" />
          )}
        </div>
      ) : (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            id="receipt-file-input"
            onChange={handleFileChange}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending}
            nativeButton={false}
            render={
              <label htmlFor="receipt-file-input" className="cursor-pointer">
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                {isPending ? "Uploading..." : "Attach photo"}
              </label>
            }
          />
        </div>
      )}
    </div>
  );
}
