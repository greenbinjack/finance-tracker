"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Landmark, Trash2, Wallet, CreditCard, Smartphone, MoreHorizontal, LineChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { isRedirectError } from "@/lib/is-redirect-error";
import {
  createSettingsAccountAction,
  updateSettingsAccountAction,
  deleteAccountAction,
} from "@/app/(app)/settings/actions";
import { accountTypes, type AccountTypeValue, type AccountInput } from "@/lib/validation/account";

export const ACCOUNT_TYPE_LABELS: Record<AccountTypeValue, string> = {
  cash: "Cash",
  bank: "Bank account",
  card: "Debit/credit card",
  mobile_wallet: "Mobile wallet",
  brokerage: "Brokerage / investment",
  other: "Other",
};

export const ACCOUNT_TYPE_ICONS: Record<AccountTypeValue, typeof Wallet> = {
  cash: Wallet,
  bank: Landmark,
  card: CreditCard,
  mobile_wallet: Smartphone,
  brokerage: LineChart,
  other: MoreHorizontal,
};

export interface AccountRecord {
  id: string;
  name: string;
  account_type: AccountTypeValue;
  institution_name: string | null;
  account_number: string | null;
  card_number: string | null;
  branch_name: string | null;
  branch_address: string | null;
  opening_balance: number;
  is_primary: boolean;
  sort_order: number;
}

export function AccountDialog({
  trigger,
  existing,
}: {
  trigger: React.ReactNode;
  existing?: AccountRecord;
}) {
  const isEditing = Boolean(existing);
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [name, setName] = useState(existing?.name ?? "");
  const [accountType, setAccountType] = useState<AccountTypeValue>(existing?.account_type ?? "cash");
  const [institutionName, setInstitutionName] = useState(existing?.institution_name ?? "");
  const [accountNumber, setAccountNumber] = useState(existing?.account_number ?? "");
  const [cardNumber, setCardNumber] = useState(existing?.card_number ?? "");
  const [branchName, setBranchName] = useState(existing?.branch_name ?? "");
  const [branchAddress, setBranchAddress] = useState(existing?.branch_address ?? "");
  const [openingBalance, setOpeningBalance] = useState(String(existing?.opening_balance ?? 0));
  const [isPending, startTransition] = useTransition();

  function resetToExisting() {
    setName(existing?.name ?? "");
    setAccountType(existing?.account_type ?? "cash");
    setInstitutionName(existing?.institution_name ?? "");
    setAccountNumber(existing?.account_number ?? "");
    setCardNumber(existing?.card_number ?? "");
    setBranchName(existing?.branch_name ?? "");
    setBranchAddress(existing?.branch_address ?? "");
    setOpeningBalance(String(existing?.opening_balance ?? 0));
  }

  function buildInput(): AccountInput | null {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Enter a name for this account");
      return null;
    }
    return {
      name: trimmedName,
      account_type: accountType,
      institution_name: institutionName || undefined,
      account_number: accountNumber || undefined,
      card_number: cardNumber || undefined,
      branch_name: branchName || undefined,
      branch_address: branchAddress || undefined,
      opening_balance: openingBalance === "" ? 0 : Number(openingBalance),
    };
  }

  function handleSaveClick() {
    const input = buildInput();
    if (!input) return;

    if (existing) {
      // Editing goes through the "Confirm changes?" step below instead of saving immediately.
      setConfirmOpen(true);
      return;
    }

    startTransition(async () => {
      try {
        await createSettingsAccountAction(input);
        toast.success("Account added");
        resetToExisting();
        setOpen(false);
      } catch (error) {
        if (isRedirectError(error)) throw error;
        toast.error("Couldn't save that account. Please try again.");
      }
    });
  }

  async function performUpdate() {
    const input = buildInput();
    if (!input || !existing) return;
    await updateSettingsAccountAction(existing.id, input);
    toast.success("Account updated");
    setOpen(false);
  }

  const showInstitutionFields = accountType !== "cash" && accountType !== "other";
  const showAccountNumber = accountType === "bank" || accountType === "mobile_wallet" || accountType === "brokerage";
  const showCardNumber = accountType === "card";
  const showBranch = accountType === "bank";
  const balanceLabel = accountType === "brokerage" ? "Ledger balance" : "Opening balance";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) resetToExisting();
      }}
    >
      <DialogTrigger className="inline-flex">{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit account" : "Add account"}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <Label htmlFor="account-name">Name</Label>
          <Input
            id="account-name"
            placeholder="e.g. Everyday bKash"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label>Type</Label>
          <Select value={accountType} onValueChange={(v) => setAccountType((v ?? "cash") as AccountTypeValue)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Cash">
                {(value: string) => ACCOUNT_TYPE_LABELS[value as AccountTypeValue] ?? "Cash"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {accountTypes.map((t) => (
                <SelectItem key={t} value={t}>
                  {ACCOUNT_TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {showInstitutionFields && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="account-institution">
              {accountType === "mobile_wallet"
                ? "Provider"
                : accountType === "brokerage"
                  ? "Broker name"
                  : "Bank name"}
            </Label>
            <Input
              id="account-institution"
              placeholder={
                accountType === "mobile_wallet"
                  ? "e.g. bKash"
                  : accountType === "brokerage"
                    ? "e.g. AB & Co."
                    : "e.g. Dutch-Bangla Bank"
              }
              value={institutionName}
              onChange={(e) => setInstitutionName(e.target.value)}
            />
          </div>
        )}

        {showAccountNumber && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="account-number">
              {accountType === "mobile_wallet"
                ? "Wallet number"
                : accountType === "brokerage"
                  ? "BO account number"
                  : "Account number"}
            </Label>
            <Input
              id="account-number"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
            />
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Label htmlFor="account-opening-balance">{balanceLabel}</Label>
          <Input
            id="account-opening-balance"
            type="number"
            inputMode="decimal"
            step="0.01"
            placeholder="0.00"
            value={openingBalance}
            onChange={(e) => setOpeningBalance(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            {accountType === "brokerage"
              ? "The settled cash balance in this account right now, before any transactions you log here."
              : "What this account already held before you started tracking it here. Leave as 0 for a fresh account."}
          </p>
        </div>

        {showCardNumber && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="card-number">Card number</Label>
            <Input id="card-number" value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} />
          </div>
        )}

        {showBranch && (
          <>
            <div className="flex flex-col gap-2">
              <Label htmlFor="branch-name">Branch name</Label>
              <Input id="branch-name" value={branchName} onChange={(e) => setBranchName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="branch-address">Branch address</Label>
              <Input
                id="branch-address"
                value={branchAddress}
                onChange={(e) => setBranchAddress(e.target.value)}
              />
            </div>
          </>
        )}

        <DialogFooter>
          <Button type="button" disabled={isPending} onClick={handleSaveClick} className="w-full sm:w-auto">
            {isPending ? "Saving..." : isEditing ? "Save changes" : "Add account"}
          </Button>
          {existing && (
            <ConfirmDialog
              title="Save these changes?"
              description="Review your changes before confirming."
              confirmLabel="Save changes"
              pendingLabel="Saving..."
              variant="default"
              onConfirm={performUpdate}
              errorMessage="Couldn't save those changes. Please try again."
              open={confirmOpen}
              onOpenChange={setConfirmOpen}
            />
          )}
          {existing && (
            <ConfirmDialog
              title={`Delete "${existing.name}"?`}
              description="This can't be undone. Transactions already tagged to it stay, just untagged."
              onConfirm={deleteAccountAction.bind(null, existing.id)}
              errorMessage="Couldn't delete this account. Please try again."
              trigger={
                <Button
                  type="button"
                  variant="destructive"
                  nativeButton={false}
                  className="w-full sm:w-auto"
                  render={
                    <span>
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </span>
                  }
                />
              }
            />
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
