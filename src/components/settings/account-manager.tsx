"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PasswordConfirmDialog } from "@/components/password-confirm-dialog";
import { AccountDetailsDialog } from "@/components/account-details-dialog";
import { AccountDialog, ACCOUNT_TYPE_LABELS, ACCOUNT_TYPE_ICONS, type AccountRecord } from "@/components/account-dialog";
import { deleteAccountAction } from "@/app/(app)/settings/actions";

export function AccountManager({ accounts }: { accounts: AccountRecord[] }) {
  const [viewingId, setViewingId] = useState<string | null>(null);
  const viewingAccount = accounts.find((a) => a.id === viewingId) ?? null;

  return (
    <div className="flex flex-col gap-2">
      {accounts.map((account) => {
        const Icon = ACCOUNT_TYPE_ICONS[account.account_type];
        return (
          <div key={account.id} className="flex items-center gap-2 rounded-lg border p-2">
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
