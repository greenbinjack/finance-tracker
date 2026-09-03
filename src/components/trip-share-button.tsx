"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Share2, Link2Off } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setEventSharingAction } from "@/app/(app)/events/actions";

export function TripShareButton({ eventId, shareToken }: { eventId: string; shareToken: string | null }) {
  const [token, setToken] = useState(shareToken);
  const [isPending, startTransition] = useTransition();

  function buildUrl(t: string) {
    return `${window.location.origin}/trips/${t}`;
  }

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't copy to clipboard");
    }
  }

  function handleShare() {
    if (token) {
      shareOrCopy(buildUrl(token));
      return;
    }
    startTransition(async () => {
      try {
        const newToken = await setEventSharingAction(eventId, true);
        if (!newToken) return;
        setToken(newToken);
        shareOrCopy(buildUrl(newToken));
      } catch {
        toast.error("Couldn't turn on sharing. Please try again.");
      }
    });
  }

  async function shareOrCopy(url: string) {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Trip itinerary", url });
        return;
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
      }
    }
    await copyToClipboard(url);
  }

  function handleStopSharing() {
    startTransition(async () => {
      try {
        await setEventSharingAction(eventId, false);
        setToken(null);
        toast.success("Sharing turned off — the old link no longer works");
      } catch {
        toast.error("Couldn't turn off sharing. Please try again.");
      }
    });
  }

  return (
    <div className="flex items-center gap-1">
      <Button type="button" variant="ghost" size="sm" disabled={isPending} onClick={handleShare}>
        <Share2 className="h-4 w-4" />
        {token ? "Share link" : "Share trip"}
      </Button>
      {token && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={isPending}
          onClick={handleStopSharing}
          aria-label="Stop sharing"
        >
          <Link2Off className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
