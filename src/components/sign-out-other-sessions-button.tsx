"use client";

import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { signOutOtherSessionsAction } from "@/app/(app)/settings/actions";

/**
 * The closest thing to session management this app can offer without a
 * service-role admin backend: revoke every OTHER session for this account
 * (this device stays signed in). There's no way to list individual sessions
 * first — see signOutOtherSessions in lib/services/auth.ts for why.
 */
export function SignOutOtherSessionsButton() {
  return (
    <ConfirmDialog
      title="Sign out of all other devices?"
      description="This device stays signed in. Any other device or browser currently signed in will be signed out immediately."
      confirmLabel="Sign out others"
      variant="default"
      onConfirm={signOutOtherSessionsAction}
      errorMessage="Couldn't sign out other sessions. Please try again."
      trigger={
        <Button type="button" variant="outline" nativeButton={false} render={<span><LogOut className="h-4 w-4" />Sign out of other devices</span>} />
      }
    />
  );
}
