import {
  startOfWeek,
  startOfMonth,
  format,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
} from "date-fns";

export type Granularity = "day" | "week" | "month";

export interface CategoryBreakdownInput {
  categoryName: string | null;
  amount: number;
}

export interface CategoryBreakdownSlice {
  name: string;
  amount: number;
  percent: number;
}

const TOP_CATEGORY_LIMIT = 6;

/**
 * Groups amounts by category, sorted descending, folding everything past
 * TOP_CATEGORY_LIMIT into a single "Other" slice — keeps the chart readable
 * and stays within the categorical palette's series cap.
 */
export function buildCategoryBreakdown(rows: CategoryBreakdownInput[]): CategoryBreakdownSlice[] {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const name = row.categoryName ?? "Uncategorized";
    totals.set(name, (totals.get(name) ?? 0) + row.amount);
  }

  const sorted = Array.from(totals.entries())
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);

  const total = sorted.reduce((sum, s) => sum + s.amount, 0);
  if (total === 0) return [];

  const top = sorted.slice(0, TOP_CATEGORY_LIMIT);
  const rest = sorted.slice(TOP_CATEGORY_LIMIT);
  const otherAmount = rest.reduce((sum, s) => sum + s.amount, 0);

  const slices = otherAmount > 0 ? [...top, { name: "Other", amount: otherAmount }] : top;

  return slices.map((s) => ({ ...s, percent: (s.amount / total) * 100 }));
}

export interface TrendInput {
  occurredOn: string;
  type: "expense" | "income";
  amount: number;
}

export interface IncomeExpenseSummary {
  income: number;
  expense: number;
  net: number;
}

/** Totals income and expense across a set of transactions (e.g. one month, for the dashboard). */
export function computeIncomeExpenseSummary(rows: { type: "expense" | "income"; amount: number }[]): IncomeExpenseSummary {
  const income = rows.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
  const expense = rows.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
  return { income, expense, net: income - expense };
}

export interface PeriodDelta {
  amount: number;
  /** Percent change vs. the previous period; null when the previous period was 0 (percent change is undefined). */
  percent: number | null;
}

export interface PeriodComparison {
  income: PeriodDelta;
  expense: PeriodDelta;
  net: PeriodDelta;
}

function delta(current: number, previous: number): PeriodDelta {
  const amount = current - previous;
  if (previous === 0) return { amount, percent: null };
  return { amount, percent: (amount / Math.abs(previous)) * 100 };
}

/** How this period's income/expense/net compares to the equivalent prior period — feeds the Reports recap card. */
export function computePeriodComparison(current: IncomeExpenseSummary, previous: IncomeExpenseSummary): PeriodComparison {
  return {
    income: delta(current.income, previous.income),
    expense: delta(current.expense, previous.expense),
    net: delta(current.net, previous.net),
  };
}

export interface TrendPoint {
  periodKey: string;
  label: string;
  income: number;
  expense: number;
}

function bucketKeyAndLabel(dateStr: string, granularity: Granularity): { key: string; label: string } {
  const date = new Date(dateStr);
  if (granularity === "day") {
    return { key: format(date, "yyyy-MM-dd"), label: format(date, "d MMM") };
  }
  if (granularity === "week") {
    const weekStart = startOfWeek(date, { weekStartsOn: 1 });
    return { key: format(weekStart, "yyyy-MM-dd"), label: format(weekStart, "d MMM") };
  }
  const monthStart = startOfMonth(date);
  return { key: format(monthStart, "yyyy-MM"), label: format(monthStart, "MMM yyyy") };
}

/** Buckets income/expense totals into chronological periods for the trend chart. */
export function buildTrend(rows: TrendInput[], granularity: Granularity): TrendPoint[] {
  const buckets = new Map<string, TrendPoint>();

  for (const row of rows) {
    const { key, label } = bucketKeyAndLabel(row.occurredOn, granularity);
    const bucket = buckets.get(key) ?? { periodKey: key, label, income: 0, expense: 0 };
    if (row.type === "income") bucket.income += row.amount;
    else bucket.expense += row.amount;
    buckets.set(key, bucket);
  }

  return Array.from(buckets.values()).sort((a, b) => a.periodKey.localeCompare(b.periodKey));
}

export interface DailyExpensePoint {
  periodKey: string;
  label: string;
  amount: number;
}

/**
 * Total expense per calendar day across [from, to], inclusive — every day in
 * the range gets a point (0 if nothing was spent), so the chart shows a
 * continuous run of days rather than skipping quiet ones.
 */
export function buildDailyExpenseSeries(
  rows: TrendInput[],
  from: string,
  to: string,
): DailyExpensePoint[] {
  const totals = new Map<string, number>();
  for (const row of rows) {
    if (row.type !== "expense") continue;
    if (row.occurredOn < from || row.occurredOn > to) continue;
    const { key } = bucketKeyAndLabel(row.occurredOn, "day");
    totals.set(key, (totals.get(key) ?? 0) + row.amount);
  }

  return eachDayOfInterval({ start: new Date(from), end: new Date(to) }).map((date) => {
    const { key, label } = bucketKeyAndLabel(format(date, "yyyy-MM-dd"), "day");
    return { periodKey: key, label, amount: totals.get(key) ?? 0 };
  });
}

export interface BalancePoint {
  periodKey: string;
  label: string;
  balance: number;
}

/**
 * Running balance across the visible date range, computed from ALL history
 * (not just the visible window) so the line starts at the correct real balance
 * rather than resetting to 0 at the start of whatever range is selected.
 * Every period in [rangeFrom, rangeTo] gets a point — periods with no
 * transactions carry forward the last known balance, so the line has no gaps.
 */
export function buildBalanceTrend(
  allRows: TrendInput[],
  granularity: Granularity,
  rangeFrom: string,
  rangeTo: string,
): BalancePoint[] {
  const sorted = [...allRows].sort((a, b) => a.occurredOn.localeCompare(b.occurredOn));

  let startingBalance = 0;
  const inRange: TrendInput[] = [];
  for (const row of sorted) {
    if (row.occurredOn < rangeFrom) {
      startingBalance += row.type === "income" ? row.amount : -row.amount;
    } else if (row.occurredOn <= rangeTo) {
      inRange.push(row);
    }
  }

  const balanceAtBucketEnd = new Map<string, number>();
  let running = startingBalance;
  for (const row of inRange) {
    running += row.type === "income" ? row.amount : -row.amount;
    const { key } = bucketKeyAndLabel(row.occurredOn, granularity);
    balanceAtBucketEnd.set(key, running);
  }

  const from = new Date(rangeFrom);
  const to = new Date(rangeTo);
  const periods =
    granularity === "day"
      ? eachDayOfInterval({ start: from, end: to })
      : granularity === "week"
        ? eachWeekOfInterval({ start: from, end: to }, { weekStartsOn: 1 })
        : eachMonthOfInterval({ start: from, end: to });

  let carried = startingBalance;
  return periods.map((date) => {
    const { key, label } = bucketKeyAndLabel(format(date, "yyyy-MM-dd"), granularity);
    if (balanceAtBucketEnd.has(key)) carried = balanceAtBucketEnd.get(key)!;
    return { periodKey: key, label, balance: carried };
  });
}
