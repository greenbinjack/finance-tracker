"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { isRedirectError } from "@/lib/is-redirect-error";
import { deleteUserAccountAction } from "@/app/(app)/settings/actions";

const CONFIRM_PHRASE = "DELETE";

export function DeleteAccountDialog({ trigger }: { trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const phraseMatches = confirmText === CONFIRM_PHRASE;

  function handleDelete() {
    if (!phraseMatches) {
      setError(`Type ${CONFIRM_PHRASE} to confirm`);
      return;
    }
    if (!password) {
      setError("Enter your password");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await deleteUserAccountAction(password);
      } catch (err) {
        if (isRedirectError(err)) throw err;
        const message = err instanceof Error ? err.message : "";
        if (message === "Incorrect password") {
          setError("Incorrect password");
        } else {
          toast.error("Couldn't delete your account. Please try again.");
        }
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setConfirmText("");
          setPassword("");
          setError(null);
        }
      }}
    >
      <DialogTrigger className="inline-flex">{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete your account</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          This permanently deletes your account and every transaction, account, investment, loan, event,
          and budget you&apos;ve recorded. This can&apos;t be undone — export your data first if you want a copy.
        </p>

        <div className="flex flex-col gap-2">
          <Label htmlFor="delete-account-confirm">
            Type <span className="font-semibold text-foreground">{CONFIRM_PHRASE}</span> to confirm
          </Label>
          <Input
            id="delete-account-confirm"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            autoComplete="off"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="delete-account-password">Password</Label>
          <Input
            id="delete-account-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="destructive"
            disabled={isPending || !phraseMatches}
            onClick={handleDelete}
            className="w-full sm:w-auto"
          >
            {isPending ? "Deleting..." : "Permanently delete my account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
