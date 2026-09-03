import Link from "next/link";
import { Plus, HandCoins, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/back-button";
import { StatCard } from "@/components/stat-card";
import { LoanRow } from "@/components/loan-row";
import { listLoans, getLoanNetEffect } from "@/lib/services/loans";
import { getProfile } from "@/lib/services/profile";

export default async function LoansPage() {
  const [profile, loans, netEffect] = await Promise.all([
    getProfile(),
    listLoans(),
    getLoanNetEffect(),
  ]);

  const currency = profile?.currency ?? "BDT";
  const given = loans.filter((l) => l.direction === "given");
  const taken = loans.filter((l) => l.direction === "taken");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <BackButton />
        <h1 className="flex-1 text-2xl font-semibold tracking-tight">Loans</h1>
        <Button
          size="sm"
          nativeButton={false}
          render={
            <Link href="/loans/new">
              <Plus className="h-4 w-4" />
              Add
            </Link>
          }
        />
      </div>

      {loans.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Owed to you"
            amount={netEffect.owedToYou}
            icon={<ArrowDownLeft className="h-5 w-5" />}
            tone="positive"
          />
          <StatCard
            label="You owe"
            amount={netEffect.youOwe}
            icon={<ArrowUpRight className="h-5 w-5" />}
            tone="negative"
            delay={0.05}
          />
        </div>
      )}

      {loans.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <HandCoins className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No loans yet — tap Add to track money you&apos;ve lent or borrowed.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {given.length > 0 && (
            <Card>
              <CardContent className="flex flex-col gap-0.5 pt-4">
                <p className="mb-1 px-2 text-xs font-medium text-muted-foreground">Owed to you</p>
                {given.map((loan) => (
                  <LoanRow key={loan.id} loan={loan} currency={currency} />
                ))}
              </CardContent>
            </Card>
          )}
          {taken.length > 0 && (
            <Card>
              <CardContent className="flex flex-col gap-0.5 pt-4">
                <p className="mb-1 px-2 text-xs font-medium text-muted-foreground">You owe</p>
                {taken.map((loan) => (
                  <LoanRow key={loan.id} loan={loan} currency={currency} />
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
