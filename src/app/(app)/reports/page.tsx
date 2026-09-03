import Link from "next/link";
import {
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subMonths,
  subYears,
  subDays,
  format,
  differenceInCalendarDays,
} from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CategoryBreakdownChart } from "@/components/category-breakdown-chart";
import { TrendChart } from "@/components/trend-chart";
import { BalanceTrendChart } from "@/components/balance-trend-chart";
import { DailyExpenseChart } from "@/components/daily-expense-chart";
import { CustomDateRangePicker } from "@/components/custom-date-range-picker";
import { ReportFiltersBar } from "@/components/report-filters-bar";
import { ReportRecap } from "@/components/report-recap";
import { ShareReportButton } from "@/components/share-report-button";
import {
  getCategoryBreakdown,
  getIncomeExpenseTrend,
  getBalanceTrend,
  getEarliestTransactionDate,
  getDailyExpenses,
  getPeriodSummary,
} from "@/lib/services/transactions";
import { getProfile } from "@/lib/services/profile";
import { listAccounts } from "@/lib/services/accounts";
import { listEvents } from "@/lib/services/events";
import { cn } from "@/lib/utils";
import type { Granularity } from "@/lib/domain/reports";

const RANGE_KEYS = ["month", "3months", "year", "all", "custom"] as const;
type RangeKey = (typeof RANGE_KEYS)[number];

function getRange(
  key: RangeKey,
  earliestTransactionDate: string | null,
  custom: { from?: string; to?: string },
): { from: string; to: string; granularity: Granularity } {
  const now = new Date();
  switch (key) {
    case "month":
      return {
        from: format(startOfMonth(now), "yyyy-MM-dd"),
        to: format(endOfMonth(now), "yyyy-MM-dd"),
        granularity: "day",
      };
    case "3months":
      return {
        from: format(startOfMonth(subMonths(now, 2)), "yyyy-MM-dd"),
        to: format(endOfMonth(now), "yyyy-MM-dd"),
        granularity: "week",
      };
    case "year":
      return {
        from: format(startOfYear(now), "yyyy-MM-dd"),
        to: format(endOfYear(now), "yyyy-MM-dd"),
        granularity: "month",
      };
    case "all":
      return {
        // Scoped to the actual earliest transaction, not an arbitrary far-past
        // date — otherwise real data gets crushed into a sliver at the chart's edge.
        from: earliestTransactionDate ?? format(startOfMonth(now), "yyyy-MM-dd"),
        to: format(now, "yyyy-MM-dd"),
        granularity: "month",
      };
    case "custom": {
      if (!custom.from || !custom.to || custom.from > custom.to) {
        return getRange("month", earliestTransactionDate, {});
      }
      const spanDays = differenceInCalendarDays(new Date(custom.to), new Date(custom.from));
      return {
        from: custom.from,
        to: custom.to,
        granularity: spanDays <= 31 ? "day" : spanDays <= 180 ? "week" : "month",
      };
    }
  }
}

/**
 * The equivalent prior period for a "vs. last period" recap — previous
 * calendar month/3-month-block/year for the presets, or an equal-length
 * window immediately before `from` for a custom range. "All time" has no
 * meaningful prior period, so it's not called for that key.
 */
function getPreviousPeriod(key: RangeKey, from: string, to: string): { from: string; to: string } {
  if (key === "month") {
    const prevMonth = subMonths(new Date(from), 1);
    return { from: format(startOfMonth(prevMonth), "yyyy-MM-dd"), to: format(endOfMonth(prevMonth), "yyyy-MM-dd") };
  }
  if (key === "3months") {
    const spanStart = subMonths(new Date(from), 3);
    const spanEnd = subDays(new Date(from), 1);
    return { from: format(startOfMonth(spanStart), "yyyy-MM-dd"), to: format(spanEnd, "yyyy-MM-dd") };
  }
  if (key === "year") {
    const prevYear = subYears(new Date(from), 1);
    return { from: format(startOfYear(prevYear), "yyyy-MM-dd"), to: format(endOfYear(prevYear), "yyyy-MM-dd") };
  }
  // custom: an equal-length window immediately before `from`
  const spanDays = differenceInCalendarDays(new Date(to), new Date(from)) + 1;
  const prevTo = subDays(new Date(from), 1);
  const prevFrom = subDays(prevTo, spanDays - 1);
  return { from: format(prevFrom, "yyyy-MM-dd"), to: format(prevTo, "yyyy-MM-dd") };
}

const PRESETS: { key: RangeKey; label: string }[] = [
  { key: "month", label: "This month" },
  { key: "3months", label: "3 months" },
  { key: "year", label: "This year" },
  { key: "all", label: "All time" },
  { key: "custom", label: "Custom" },
];

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{
    range?: string;
    catType?: string;
    from?: string;
    to?: string;
    accountId?: string;
    eventId?: string;
  }>;
}) {
  const { range, catType, from: customFrom, to: customTo, accountId, eventId } = await searchParams;
  const rangeKey: RangeKey = RANGE_KEYS.includes(range as RangeKey) ? (range as RangeKey) : "month";
  const breakdownType: "expense" | "income" = catType === "income" ? "income" : "expense";
  const earliestTransactionDate = rangeKey === "all" ? await getEarliestTransactionDate() : null;
  const { from, to, granularity } = getRange(rangeKey, earliestTransactionDate, {
    from: customFrom,
    to: customTo,
  });
  const today = format(new Date(), "yyyy-MM-dd");
  const dailyFrom = format(subDays(new Date(), 29), "yyyy-MM-dd");
  const dailyTo = today;
  // Balance is plotted as one point per period across the whole range — clamp
  // to today so it never draws a flat line through days that haven't happened
  // yet (e.g. "This month" spans to month-end, which is often still future).
  const balanceTo = to > today ? today : to;
  const filters = { accountId, eventId };

  // Two smaller batches rather than one 8-way Promise.all — bursting that
  // many simultaneous new connections to Supabase at once was found to
  // occasionally stall for 10+ seconds (same root cause as the dashboard's
  // get_dashboard_data fix). Halving peak concurrency avoids it without
  // needing this page's very differently-shaped queries (several date
  // ranges, optional filters) consolidated into one RPC.
  const [profile, accounts, events, periodSummary] = await Promise.all([
    getProfile(),
    listAccounts(),
    listEvents(),
    getPeriodSummary(from, to, filters),
  ]);
  const [breakdown, trend, balanceTrend, dailyExpenses] = await Promise.all([
    getCategoryBreakdown(from, to, breakdownType, filters),
    getIncomeExpenseTrend(from, to, granularity, filters),
    getBalanceTrend(from, balanceTo, granularity, filters),
    getDailyExpenses(dailyFrom, dailyTo, filters),
  ]);

  const previousPeriodSummary =
    rangeKey === "all"
      ? null
      : await (async () => {
          const prev = getPreviousPeriod(rangeKey, from, to);
          return getPeriodSummary(prev.from, prev.to, filters);
        })();

  const currency = profile?.currency ?? "BDT";
  const filterParams = `${accountId ? `&accountId=${accountId}` : ""}${eventId ? `&eventId=${eventId}` : ""}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <div className="flex gap-1.5">
          <Link
            href={`/api/export/reports?from=${from}&to=${to}${filterParams}`}
            className="inline-flex h-8 items-center rounded-md border border-border px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Export CSV
          </Link>
          <ShareReportButton
            rangeLabel={PRESETS.find((p) => p.key === rangeKey)?.label ?? "Custom range"}
            from={from}
            to={to}
            summary={periodSummary}
            currency={currency}
          />
        </div>
      </div>

      <ReportFiltersBar accounts={accounts} events={events} />

      <div className="flex gap-2 overflow-x-auto pb-1">
        {PRESETS.map((p) => {
          const active = rangeKey === p.key;
          const href =
            p.key === "custom"
              ? `/reports?range=custom&catType=${breakdownType}&from=${from}&to=${to}${filterParams}`
              : `/reports?range=${p.key}&catType=${breakdownType}${filterParams}`;
          return (
            <Link
              key={p.key}
              href={href}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-sm transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {p.label}
            </Link>
          );
        })}
      </div>

      {rangeKey === "custom" && (
        <CustomDateRangePicker catType={breakdownType} initialFrom={from} initialTo={to} />
      )}

      {previousPeriodSummary && (
        <ReportRecap current={periodSummary} previous={previousPeriodSummary} currency={currency} />
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daily expenses</CardTitle>
          <p className="text-xs text-muted-foreground">
            Last 30 days{accountId || eventId ? ", filtered above" : ""} — independent of the date range preset
          </p>
        </CardHeader>
        <CardContent>
          <DailyExpenseChart data={dailyExpenses} currency={currency} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Balance over time</CardTitle>
        </CardHeader>
        <CardContent>
          <BalanceTrendChart data={balanceTrend} currency={currency} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Income vs. expense</CardTitle>
        </CardHeader>
        <CardContent>
          <TrendChart data={trend} currency={currency} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">
            {breakdownType === "expense" ? "Spending" : "Income"} by category
          </CardTitle>
          <div className="flex gap-1 rounded-lg bg-muted p-0.5">
            {(["expense", "income"] as const).map((t) => (
              <Link
                key={t}
                href={
                  rangeKey === "custom"
                    ? `/reports?range=custom&catType=${t}&from=${from}&to=${to}${filterParams}`
                    : `/reports?range=${rangeKey}&catType=${t}${filterParams}`
                }
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors",
                  breakdownType === t
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground",
                )}
              >
                {t}
              </Link>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <CategoryBreakdownChart
            data={breakdown}
            currency={currency}
            emptyMessage={`No ${breakdownType} transactions in this period.`}
          />
        </CardContent>
      </Card>
    </div>
  );
}
