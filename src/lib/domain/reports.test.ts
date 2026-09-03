import { describe, it, expect } from "vitest";
import {
  buildCategoryBreakdown,
  buildTrend,
  buildBalanceTrend,
  buildDailyExpenseSeries,
  computeIncomeExpenseSummary,
  computePeriodComparison,
} from "./reports";

describe("computeIncomeExpenseSummary", () => {
  it("sums income and expense separately and nets them", () => {
    const result = computeIncomeExpenseSummary([
      { type: "income", amount: 20000 },
      { type: "expense", amount: 450 },
      { type: "expense", amount: 23 },
    ]);
    expect(result).toEqual({ income: 20000, expense: 473, net: 19527 });
  });

  it("returns zeros for an empty set", () => {
    expect(computeIncomeExpenseSummary([])).toEqual({ income: 0, expense: 0, net: 0 });
  });

  it("handles expense-only and income-only sets", () => {
    expect(computeIncomeExpenseSummary([{ type: "expense", amount: 100 }])).toEqual({
      income: 0,
      expense: 100,
      net: -100,
    });
    expect(computeIncomeExpenseSummary([{ type: "income", amount: 100 }])).toEqual({
      income: 100,
      expense: 0,
      net: 100,
    });
  });
});

describe("computePeriodComparison", () => {
  it("computes amount and percent deltas for a normal increase", () => {
    const result = computePeriodComparison(
      { income: 20000, expense: 6000, net: 14000 },
      { income: 10000, expense: 5000, net: 5000 },
    );
    expect(result.income).toEqual({ amount: 10000, percent: 100 });
    expect(result.expense).toEqual({ amount: 1000, percent: 20 });
    expect(result.net).toEqual({ amount: 9000, percent: 180 });
  });

  it("computes a decrease as a negative delta", () => {
    const result = computePeriodComparison({ income: 5000, expense: 5000, net: 0 }, { income: 10000, expense: 5000, net: 5000 });
    expect(result.income.amount).toBe(-5000);
    expect(result.income.percent).toBe(-50);
  });

  it("returns a null percent when the previous period was zero", () => {
    const result = computePeriodComparison({ income: 500, expense: 0, net: 500 }, { income: 0, expense: 0, net: 0 });
    expect(result.income).toEqual({ amount: 500, percent: null });
  });

  it("returns zero deltas when both periods match", () => {
    const summary = { income: 1000, expense: 400, net: 600 };
    const result = computePeriodComparison(summary, summary);
    expect(result.income).toEqual({ amount: 0, percent: 0 });
    expect(result.expense).toEqual({ amount: 0, percent: 0 });
    expect(result.net).toEqual({ amount: 0, percent: 0 });
  });
});

describe("buildCategoryBreakdown", () => {
  it("groups and sums by category name", () => {
    const result = buildCategoryBreakdown([
      { categoryName: "Food", amount: 100 },
      { categoryName: "Food", amount: 50 },
      { categoryName: "Transport", amount: 30 },
    ]);
    expect(result).toEqual([
      { name: "Food", amount: 150, percent: (150 / 180) * 100 },
      { name: "Transport", amount: 30, percent: (30 / 180) * 100 },
    ]);
  });

  it("treats a null category as Uncategorized", () => {
    const result = buildCategoryBreakdown([{ categoryName: null, amount: 100 }]);
    expect(result[0].name).toBe("Uncategorized");
  });

  it("folds everything past the top 6 into Other", () => {
    const rows = Array.from({ length: 8 }, (_, i) => ({
      categoryName: `Cat${i}`,
      amount: 8 - i, // Cat0=8 ... Cat7=1, strictly descending so order is deterministic
    }));
    const result = buildCategoryBreakdown(rows);
    expect(result).toHaveLength(7); // top 6 + Other
    expect(result[6].name).toBe("Other");
    expect(result[6].amount).toBe(1 + 2); // Cat6 (2) + Cat7 (1)
  });

  it("returns an empty array when there is no data", () => {
    expect(buildCategoryBreakdown([])).toEqual([]);
  });

  it("percentages sum to 100", () => {
    const result = buildCategoryBreakdown([
      { categoryName: "A", amount: 25 },
      { categoryName: "B", amount: 75 },
    ]);
    const totalPercent = result.reduce((sum, s) => sum + s.percent, 0);
    expect(totalPercent).toBeCloseTo(100);
  });
});

describe("buildTrend", () => {
  it("buckets by day and separates income/expense", () => {
    const result = buildTrend(
      [
        { occurredOn: "2026-09-01", type: "expense", amount: 100 },
        { occurredOn: "2026-09-01", type: "income", amount: 500 },
        { occurredOn: "2026-09-02", type: "expense", amount: 50 },
      ],
      "day",
    );
    expect(result).toEqual([
      { periodKey: "2026-09-01", label: "1 Sep", income: 500, expense: 100 },
      { periodKey: "2026-09-02", label: "2 Sep", income: 0, expense: 50 },
    ]);
  });

  it("buckets by month", () => {
    const result = buildTrend(
      [
        { occurredOn: "2026-09-05", type: "expense", amount: 100 },
        { occurredOn: "2026-09-20", type: "expense", amount: 200 },
        { occurredOn: "2026-10-01", type: "expense", amount: 50 },
      ],
      "month",
    );
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ periodKey: "2026-09", label: "Sep 2026", income: 0, expense: 300 });
    expect(result[1].periodKey).toBe("2026-10");
  });

  it("returns points in chronological order", () => {
    const result = buildTrend(
      [
        { occurredOn: "2026-09-10", type: "expense", amount: 1 },
        { occurredOn: "2026-09-01", type: "expense", amount: 1 },
        { occurredOn: "2026-09-05", type: "expense", amount: 1 },
      ],
      "day",
    );
    expect(result.map((r) => r.periodKey)).toEqual(["2026-09-01", "2026-09-05", "2026-09-10"]);
  });

  it("returns an empty array for no data", () => {
    expect(buildTrend([], "day")).toEqual([]);
  });
});

describe("buildBalanceTrend", () => {
  it("starts from the real balance accumulated before the visible range, not zero", () => {
    const rows = [
      { occurredOn: "2026-08-01", type: "income" as const, amount: 1000 },
      { occurredOn: "2026-09-05", type: "expense" as const, amount: 100 },
    ];
    const result = buildBalanceTrend(rows, "day", "2026-09-01", "2026-09-05");
    // Before the range: +1000. On 2026-09-05: -100 -> 900.
    expect(result[0].balance).toBe(1000);
    expect(result[result.length - 1].balance).toBe(900);
  });

  it("carries the balance forward through periods with no transactions", () => {
    const rows = [
      { occurredOn: "2026-09-01", type: "income" as const, amount: 500 },
      { occurredOn: "2026-09-05", type: "expense" as const, amount: 200 },
    ];
    const result = buildBalanceTrend(rows, "day", "2026-09-01", "2026-09-06");
    expect(result).toHaveLength(6); // one point per day, no gaps
    expect(result.map((r) => r.balance)).toEqual([500, 500, 500, 500, 300, 300]);
  });

  it("produces one point per period across the full range even with zero transactions", () => {
    const result = buildBalanceTrend([], "day", "2026-09-01", "2026-09-03");
    expect(result).toEqual([
      { periodKey: "2026-09-01", label: "1 Sep", balance: 0 },
      { periodKey: "2026-09-02", label: "2 Sep", balance: 0 },
      { periodKey: "2026-09-03", label: "3 Sep", balance: 0 },
    ]);
  });

  it("ignores transactions after the visible range", () => {
    const rows = [
      { occurredOn: "2026-09-01", type: "income" as const, amount: 100 },
      { occurredOn: "2026-10-01", type: "income" as const, amount: 99999 },
    ];
    const result = buildBalanceTrend(rows, "day", "2026-09-01", "2026-09-02");
    expect(result.every((r) => r.balance === 100)).toBe(true);
  });
});

describe("buildDailyExpenseSeries", () => {
  it("sums expense per day and ignores income", () => {
    const result = buildDailyExpenseSeries(
      [
        { occurredOn: "2026-09-01", type: "expense", amount: 100 },
        { occurredOn: "2026-09-01", type: "expense", amount: 50 },
        { occurredOn: "2026-09-01", type: "income", amount: 5000 },
      ],
      "2026-09-01",
      "2026-09-01",
    );
    expect(result).toEqual([{ periodKey: "2026-09-01", label: "1 Sep", amount: 150 }]);
  });

  it("fills every day in range with 0 when there's no spending", () => {
    const result = buildDailyExpenseSeries(
      [{ occurredOn: "2026-09-01", type: "expense", amount: 100 }],
      "2026-09-01",
      "2026-09-04",
    );
    expect(result).toEqual([
      { periodKey: "2026-09-01", label: "1 Sep", amount: 100 },
      { periodKey: "2026-09-02", label: "2 Sep", amount: 0 },
      { periodKey: "2026-09-03", label: "3 Sep", amount: 0 },
      { periodKey: "2026-09-04", label: "4 Sep", amount: 0 },
    ]);
  });

  it("excludes transactions outside the range", () => {
    const result = buildDailyExpenseSeries(
      [
        { occurredOn: "2026-08-31", type: "expense", amount: 999 },
        { occurredOn: "2026-09-05", type: "expense", amount: 999 },
        { occurredOn: "2026-09-01", type: "expense", amount: 50 },
      ],
      "2026-09-01",
      "2026-09-01",
    );
    expect(result).toEqual([{ periodKey: "2026-09-01", label: "1 Sep", amount: 50 }]);
  });
});
