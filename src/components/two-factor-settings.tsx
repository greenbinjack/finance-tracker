"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
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
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  enrollTotpAction,
  verifyMfaEnrollmentAction,
  listMfaFactorsAction,
  unenrollMfaFactorAction,
} from "@/app/(app)/settings/actions";
import type { MfaFactorSummary } from "@/lib/services/mfa";

function EnrollDialog({ onEnrolled }: { onEnrolled: () => void }) {
  const [open, setOpen] = useState(false);
  const [enrollment, setEnrollment] = useState<{ factorId: string; qrCodeSvg: string; secret: string } | null>(
    null,
  );
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function startEnrollment() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await enrollTotpAction();
        setEnrollment(result);
      } catch {
        toast.error("Couldn't start 2FA setup. Please try again.");
        setOpen(false);
      }
    });
  }

  function handleVerify() {
    if (!enrollment) return;
    if (code.length !== 6) {
      setError("Enter the 6-digit code from your authenticator app");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await verifyMfaEnrollmentAction(enrollment.factorId, code);
        toast.success("Two-factor authentication enabled");
        setOpen(false);
        setEnrollment(null);
        setCode("");
        onEnrolled();
      } catch {
        setError("Incorrect code — try again");
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setEnrollment(null);
          setCode("");
          setError(null);
          startEnrollment();
        }
      }}
    >
      <DialogTrigger className="inline-flex">
        <Button type="button" size="sm" nativeButton={false} render={<span>Enable 2FA</span>} />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set up two-factor authentication</DialogTitle>
        </DialogHeader>

        {!enrollment ? (
          <p className="text-sm text-muted-foreground">{isPending ? "Preparing..." : "Loading..."}</p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Scan this code with an authenticator app (Google Authenticator, Authy, 1Password...), or enter
              the secret manually.
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element -- a data: URI SVG, not an optimizable remote image */}
            <img
              src={
                enrollment.qrCodeSvg.startsWith("data:")
                  ? enrollment.qrCodeSvg
                  : `data:image/svg+xml;utf-8,${enrollment.qrCodeSvg}`
              }
              alt="Two-factor authentication QR code"
              className="mx-auto h-48 w-48"
            />
            <p className="break-all rounded-lg bg-muted px-2 py-1.5 text-center font-mono text-xs">
              {enrollment.secret}
            </p>
            <div className="flex flex-col gap-2">
              <Label htmlFor="totp-code">6-digit code</Label>
              <Input
                id="totp-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleVerify();
                  }
                }}
              />
              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>
            <DialogFooter>
              <Button type="button" disabled={isPending} onClick={handleVerify} className="w-full sm:w-auto">
                {isPending ? "Verifying..." : "Verify & enable"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DisableTwoFactor({ factor, onDisabled }: { factor: MfaFactorSummary; onDisabled: () => void }) {
  async function handleDisable() {
    await unenrollMfaFactorAction(factor.id);
    toast.success("Two-factor authentication disabled");
    onDisabled();
  }

  return (
    <ConfirmDialog
      title="Disable two-factor authentication"
      description="Your account will only need your password to sign in from here on."
      confirmLabel="Disable 2FA"
      pendingLabel="Disabling..."
      onConfirm={handleDisable}
      errorMessage="Couldn't disable 2FA. Please try again."
      trigger={<Button type="button" size="sm" variant="outline" nativeButton={false} render={<span>Disable</span>} />}
    />
  );
}

export function TwoFactorSettings({ initialFactors }: { initialFactors: MfaFactorSummary[] }) {
  const [factors, setFactors] = useState(initialFactors);
  // Keep local state in sync when the server-provided prop changes (e.g. a
  // revalidation from elsewhere) — adjusted during render per React's "you
  // might not need an effect" pattern, not via useEffect.
  const [syncedFactors, setSyncedFactors] = useState(initialFactors);
  if (initialFactors !== syncedFactors) {
    setSyncedFactors(initialFactors);
    setFactors(initialFactors);
  }

  function refresh() {
    listMfaFactorsAction().then(setFactors);
  }

  const enabled = factors.length > 0;

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <ShieldCheck className={enabled ? "h-4 w-4 text-emerald-600 dark:text-emerald-400" : "h-4 w-4 text-muted-foreground"} />
        <p className="text-sm">
          {enabled ? "Two-factor authentication is enabled" : "Add a second step when signing in"}
        </p>
      </div>
      {enabled ? (
        <DisableTwoFactor factor={factors[0]} onDisabled={refresh} />
      ) : (
        <EnrollDialog onEnrolled={refresh} />
      )}
    </div>
  );
}
