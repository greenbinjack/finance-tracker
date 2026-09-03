import Link from "next/link";
import { ChevronLeft, ArrowLeftRight, Download, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CurrencySelector } from "@/components/settings/currency-selector";
import { CategoryManager } from "@/components/settings/category-manager";
import { AccountManager } from "@/components/settings/account-manager";
import { TransferDialog } from "@/components/transfer-dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import { DeleteAccountDialog } from "@/components/delete-account-dialog";
import { TwoFactorSettings } from "@/components/two-factor-settings";
import { getProfile } from "@/lib/services/profile";
import { listCategories } from "@/lib/services/categories";
import { listAccounts } from "@/lib/services/accounts";
import { listVerifiedTotpFactors } from "@/lib/services/mfa";

export default async function SettingsPage() {
  const [profile, categories, accounts, mfaFactors] = await Promise.all([
    getProfile(),
    listCategories(),
    listAccounts(),
    listVerifiedTotpFactors(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          nativeButton={false}
          render={
            <Link href="/more">
              <ChevronLeft className="h-5 w-5" />
            </Link>
          }
        />
        <h1 className="text-lg font-semibold">Settings</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Appearance</CardTitle>
        </CardHeader>
        <CardContent>
          <ThemeToggle />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Currency</CardTitle>
        </CardHeader>
        <CardContent>
          <CurrencySelector currency={profile?.currency ?? "BDT"} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <CategoryManager categories={categories} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Accounts</CardTitle>
          {accounts.length >= 2 && (
            <TransferDialog
              accounts={accounts}
              trigger={
                <span className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                  <ArrowLeftRight className="h-4 w-4" />
                  Transfer
                </span>
              }
            />
          )}
        </CardHeader>
        <CardContent>
          <AccountManager accounts={accounts} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Security</CardTitle>
        </CardHeader>
        <CardContent>
          <TwoFactorSettings initialFactors={mfaFactors} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Data</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            nativeButton={false}
            render={
              <a href="/api/export/transactions" download>
                <Download className="h-4 w-4" />
                Export transactions (CSV)
              </a>
            }
          />
          <Button
            type="button"
            variant="outline"
            nativeButton={false}
            render={
              <a href="/api/export/data" download>
                <Download className="h-4 w-4" />
                Export everything (JSON)
              </a>
            }
          />
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-destructive">
            <TriangleAlert className="h-4 w-4" />
            Danger zone
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DeleteAccountDialog
            trigger={
              <Button type="button" variant="destructive" nativeButton={false} render={<span>Delete account</span>} />
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
