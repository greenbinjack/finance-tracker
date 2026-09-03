import Link from "next/link";
import { Plus, TrendingUp, Wallet, Scale } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/back-button";
import { StatCard } from "@/components/stat-card";
import { InvestmentRow } from "@/components/investment-row";
import { listInvestments, getInvestmentSummary } from "@/lib/services/investments";
import { getProfile } from "@/lib/services/profile";

export default async function InvestmentsPage() {
  const [profile, investments, summary] = await Promise.all([
    getProfile(),
    listInvestments(),
    getInvestmentSummary(),
  ]);

  const currency = profile?.currency ?? "BDT";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <BackButton />
        <h1 className="flex-1 text-2xl font-semibold tracking-tight">Investments</h1>
        <Button
          size="sm"
          nativeButton={false}
          render={
            <Link href="/investments/new">
              <Plus className="h-4 w-4" />
              Add
            </Link>
          }
        />
      </div>

      {investments.length > 0 && (
        <div className="grid grid-cols-1 gap-3">
          <StatCard
            label="Gain / loss"
            amount={summary.gainLoss.amount}
            icon={<Scale className="h-5 w-5" />}
            tone={summary.gainLoss.amount >= 0 ? "positive" : "negative"}
          />
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="Invested"
              amount={summary.totalInvested}
              icon={<Wallet className="h-5 w-5" />}
              tone="default"
              delay={0.05}
            />
            <StatCard
              label="Current value"
              amount={summary.totalCurrentValue}
              icon={<TrendingUp className="h-5 w-5" />}
              tone="default"
              delay={0.1}
            />
          </div>
        </div>
      )}

      <Card>
        <CardContent className="flex flex-col gap-0.5">
          {investments.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No investments yet — tap Add to log your first one.
            </p>
          ) : (
            investments.map((inv) => (
              <InvestmentRow key={inv.id} investment={inv} currency={currency} />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
