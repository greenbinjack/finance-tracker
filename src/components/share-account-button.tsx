"use client";

import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ACCOUNT_TYPE_LABELS, type AccountRecord } from "@/components/account-dialog";

function buildShareText(account: AccountRecord): string {
  const lines = [account.name];
  if (account.institution_name) lines.push(account.institution_name);
  lines.push(ACCOUNT_TYPE_LABELS[account.account_type]);
  if (account.account_number) lines.push(`Account number: ${account.account_number}`);
  if (account.card_number) lines.push(`Card number: ${account.card_number}`);
  if (account.branch_name) lines.push(`Branch: ${account.branch_name}`);
  if (account.branch_address) lines.push(account.branch_address);
  return lines.join("\n");
}

/** Only ever rendered from inside AccountDetailsDialog, once the user's already confirmed their password to open it — no separate prompt here. */
export function ShareAccountButton({ account }: { account: AccountRecord }) {
  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Couldn't copy to clipboard");
    }
  }

  async function handleShare() {
    const text = buildShareText(account);

    if (navigator.share) {
      try {
        await navigator.share({ title: account.name, text });
      } catch (error) {
        // AbortError just means the user closed the share sheet — not a failure.
        if (error instanceof Error && error.name === "AbortError") return;
        toast.error("Couldn't share. Copying to clipboard instead.");
        await copyToClipboard(text);
      }
      return;
    }

    await copyToClipboard(text);
  }

  return (
    <Button type="button" variant="outline" onClick={handleShare} className="w-full sm:w-auto">
      <Share2 className="h-4 w-4" />
      Share
    </Button>
  );
}
