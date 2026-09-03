"use client";

import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ShareAccountButton } from "@/components/share-account-button";
import { AccountDialog, ACCOUNT_TYPE_LABELS, type AccountRecord } from "@/components/account-dialog";

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

/**
 * Shown after the user already confirmed their password (see AccountManager)
 * — everything here is unmasked, and Edit/Share act immediately with no
 * further prompts, per the "verify once, then allow the whole operation"
 * request.
 */
export function AccountDetailsDialog({
  account,
  open,
  onOpenChange,
}: {
  account: AccountRecord;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{account.name}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <DetailRow label="Type" value={ACCOUNT_TYPE_LABELS[account.account_type]} />
          {account.institution_name && <DetailRow label="Institution" value={account.institution_name} />}
          {account.account_number && <DetailRow label="Account number" value={account.account_number} />}
          {account.card_number && <DetailRow label="Card number" value={account.card_number} />}
          {account.branch_name && <DetailRow label="Branch" value={account.branch_name} />}
          {account.branch_address && <DetailRow label="Branch address" value={account.branch_address} />}
        </div>

        <DialogFooter>
          <ShareAccountButton account={account} />
          <AccountDialog
            existing={account}
            trigger={
              <Button
                nativeButton={false}
                className="w-full sm:w-auto"
                render={
                  <span>
                    <Pencil className="h-4 w-4" />
                    Edit
                  </span>
                }
              />
            }
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
