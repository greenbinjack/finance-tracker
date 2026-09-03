import { describe, it, expect } from "vitest";
import { computeBudgetStatus } from "./budgets";

describe("computeBudgetStatus", () => {
  it("computes remaining and percent used when under the cap", () => {
    const result = computeBudgetStatus(3000, 10000);
    expect(result.remaining).toBe(7000);
    expect(result.percentUsed).toBe(30);
    expect(result.isOverBudget).toBe(false);
  });

  it("flags over-cap spend", () => {
    const result = computeBudgetStatus(12000, 10000);
    expect(result.remaining).toBe(-2000);
    expect(result.percentUsed).toBe(120);
    expect(result.isOverBudget).toBe(true);
  });

  it("returns nulls for percent/remaining when no cap is set", () => {
    const result = computeBudgetStatus(500, null);
    expect(result.remaining).toBeNull();
    expect(result.percentUsed).toBeNull();
    expect(result.isOverBudget).toBe(false);
  });

  it("treats a 0 cap the same as no cap (avoids divide-by-zero)", () => {
    const result = computeBudgetStatus(500, 0);
    expect(result.percentUsed).toBeNull();
    expect(result.isOverBudget).toBe(false);
  });
});
