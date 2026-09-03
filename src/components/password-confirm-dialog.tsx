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
import { verifyPasswordAction } from "@/app/(app)/settings/actions";

/** Re-checks the account password before letting something sensitive happen — revealing a card number, or confirming a transfer. */
export function PasswordConfirmDialog({
  title,
  description,
  confirmLabel = "Confirm",
  onVerified,
  trigger,
}: {
  title: string;
  description?: string;
  confirmLabel?: string;
  onVerified: () => void;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    if (!password) {
      setError("Enter your password");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const ok = await verifyPasswordAction(password);
        if (!ok) {
          setError("Incorrect password");
          return;
        }
        setOpen(false);
        setPassword("");
        onVerified();
      } catch {
        toast.error("Couldn't verify your password. Please try again.");
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setPassword("");
          setError(null);
        }
      }}
    >
      <DialogTrigger className="inline-flex">{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {description && <p className="text-sm text-muted-foreground">{description}</p>}

        <div className="flex flex-col gap-2">
          <Label htmlFor="password-confirm-input">Password</Label>
          <Input
            id="password-confirm-input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleConfirm();
              }
            }}
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button type="button" disabled={isPending} onClick={handleConfirm}>
            {isPending ? "Checking..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
