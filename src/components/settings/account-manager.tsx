"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Star, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PasswordConfirmDialog } from "@/components/password-confirm-dialog";
import { AccountDetailsDialog } from "@/components/account-details-dialog";
import { AccountDialog, ACCOUNT_TYPE_LABELS, ACCOUNT_TYPE_ICONS, type AccountRecord } from "@/components/account-dialog";
import { cn } from "@/lib/utils";
import {
  deleteAccountAction,
  setPrimaryAccountAction,
  unsetPrimaryAccountAction,
  moveAccountAction,
} from "@/app/(app)/settings/actions";

export function AccountManager({ accounts }: { accounts: AccountRecord[] }) {
  const [viewingId, setViewingId] = useState<string | null>(null);
  const viewingAccount = accounts.find((a) => a.id === viewingId) ?? null;
  const [isPending, startTransition] = useTransition();

  function togglePrimary(account: AccountRecord) {
    startTransition(async () => {
      try {
        if (account.is_primary) await unsetPrimaryAccountAction(account.id);
        else await setPrimaryAccountAction(account.id);
      } catch {
        toast.error("Couldn't update that. Please try again.");
      }
    });
  }

  function move(id: string, direction: "up" | "down") {
    startTransition(async () => {
      try {
        await moveAccountAction(id, direction);
      } catch {
        toast.error("Couldn't reorder that. Please try again.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {accounts.map((account, index) => {
        const Icon = ACCOUNT_TYPE_ICONS[account.account_type];
        return (
          <div key={account.id} className="flex items-center gap-1 rounded-lg border p-2">
            <div className="flex flex-col">
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                className="h-4"
                disabled={isPending || index === 0}
                onClick={() => move(account.id, "up")}
                aria-label={`Move ${account.name} up`}
              >
                <ChevronUp className="h-3 w-3" />
              </Button>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                className="h-4"
                disabled={isPending || index === accounts.length - 1}
                onClick={() => move(account.id, "down")}
                aria-label={`Move ${account.name} down`}
              >
                <ChevronDown className="h-3 w-3" />
              </Button>
            </div>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              disabled={isPending}
              onClick={() => togglePrimary(account)}
              aria-label={account.is_primary ? `Unset ${account.name} as primary` : `Set ${account.name} as primary`}
            >
              <Star className={cn("h-3.5 w-3.5", account.is_primary && "fill-amber-400 text-amber-400")} />
            </Button>
            <PasswordConfirmDialog
              title="Confirm your password"
              description={`Enter your password to view "${account.name}".`}
              confirmLabel="Continue"
              onVerified={() => setViewingId(account.id)}
              trigger={
                <span className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-lg p-1">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1 text-left">
                    <span className="block truncate text-sm font-medium">{account.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {ACCOUNT_TYPE_LABELS[account.account_type]}
                      {account.institution_name ? ` · ${account.institution_name}` : ""}
                    </span>
                  </span>
                </span>
              }
            />
            <ConfirmDialog
              title={`Delete "${account.name}"?`}
              description="This can't be undone. Transactions already tagged to it stay, just untagged."
              onConfirm={deleteAccountAction.bind(null, account.id)}
              errorMessage="Couldn't delete this account. Please try again."
              trigger={
                <Button
                  size="icon-sm"
                  variant="ghost"
                  nativeButton={false}
                  render={
                    <span>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </span>
                  }
                />
              }
            />
          </div>
        );
      })}

      <AccountDialog
        trigger={
          <span className="mt-1 inline-flex cursor-pointer items-center gap-1.5 self-start rounded-lg px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <Plus className="h-4 w-4" />
            Add account
          </span>
        }
      />

      {viewingAccount && (
        <AccountDetailsDialog
          account={viewingAccount}
          open={viewingId !== null}
          onOpenChange={(next) => setViewingId(next ? viewingAccount.id : null)}
        />
      )}
    </div>
  );
}
