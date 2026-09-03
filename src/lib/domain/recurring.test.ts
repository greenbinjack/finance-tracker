import { describe, it, expect } from "vitest";
import { detectRecurringTransactions } from "./recurring";

const RENT_CATEGORY = "cat-rent";

function tx(occurredOn: string, overrides: Partial<Parameters<typeof detectRecurringTransactions>[0][number]> = {}) {
  return {
    categoryId: RENT_CATEGORY,
    accountId: "acc-1",
    amount: 5000,
    occurredOn,
    note: "Rent",
    ...overrides,
  };
}

describe("detectRecurringTransactions", () => {
  it("detects a monthly pattern due again within the next few days", () => {
    // Paid on the 3rd for three months running; today is one day before the
    // 4th month's due date.
    const suggestions = detectRecurringTransactions(
      [tx("2026-06-03"), tx("2026-07-03"), tx("2026-08-03")],
      "2026-09-02",
    );
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]).toMatchObject({
      categoryId: RENT_CATEGORY,
      amount: 5000,
      occurrences: 3,
      lastOccurredOn: "2026-08-03",
      nextDueOn: "2026-09-03",
    });
  });

  it("detects a weekly pattern", () => {
    const suggestions = detectRecurringTransactions(
      [
        tx("2026-08-13", { categoryId: "cat-groceries", amount: 800 }),
        tx("2026-08-20", { categoryId: "cat-groceries", amount: 800 }),
        tx("2026-08-27", { categoryId: "cat-groceries", amount: 800 }),
      ],
      "2026-09-02",
    );
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].nextDueOn).toBe("2026-09-03");
  });

  it("requires at least 3 occurrences", () => {
    const suggestions = detectRecurringTransactions([tx("2026-07-03"), tx("2026-08-03")], "2026-09-02");
    expect(suggestions).toHaveLength(0);
  });

  it("ignores uncategorized transactions", () => {
    const suggestions = detectRecurringTransactions(
      [
        tx("2026-06-03", { categoryId: null }),
        tx("2026-07-03", { categoryId: null }),
        tx("2026-08-03", { categoryId: null }),
      ],
      "2026-09-02",
    );
    expect(suggestions).toHaveLength(0);
  });

  it("ignores an irregular (non-recurring) spending pattern", () => {
    const suggestions = detectRecurringTransactions(
      [tx("2026-06-01"), tx("2026-06-15"), tx("2026-08-20")],
      "2026-09-02",
    );
    expect(suggestions).toHaveLength(0);
  });

  it("does not surface a pattern that isn't due soon", () => {
    // Same monthly rent pattern, but today is right after payment — over a
    // week until the next one is due.
    const suggestions = detectRecurringTransactions(
      [tx("2026-06-03"), tx("2026-07-03"), tx("2026-08-03")],
      "2026-08-05",
    );
    expect(suggestions).toHaveLength(0);
  });

  it("treats different amounts in the same category as separate patterns", () => {
    const suggestions = detectRecurringTransactions(
      [
        tx("2026-06-03", { amount: 5000 }),
        tx("2026-07-03", { amount: 5000 }),
        tx("2026-08-03", { amount: 5000 }),
        tx("2026-06-10", { amount: 200 }),
        tx("2026-07-10", { amount: 200 }),
      ],
      "2026-09-02",
    );
    // Only the 5000 group has 3+ occurrences and is due soon.
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].amount).toBe(5000);
  });
});
