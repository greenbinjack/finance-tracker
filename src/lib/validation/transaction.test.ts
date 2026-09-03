import { describe, it, expect } from "vitest";
import { transactionSchema } from "./transaction";

describe("transactionSchema", () => {
  it("accepts a minimal valid expense", () => {
    const result = transactionSchema.safeParse({
      type: "expense",
      amount: "150",
      occurred_on: "2026-09-01",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.amount).toBe(150);
  });

  it("rejects a zero or negative amount", () => {
    expect(transactionSchema.safeParse({ type: "expense", amount: 0, occurred_on: "2026-09-01" }).success).toBe(
      false,
    );
    expect(
      transactionSchema.safeParse({ type: "expense", amount: -50, occurred_on: "2026-09-01" }).success,
    ).toBe(false);
  });

  it("rejects a missing date", () => {
    const result = transactionSchema.safeParse({ type: "income", amount: 100, occurred_on: "" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid type", () => {
    const result = transactionSchema.safeParse({
      type: "transfer",
      amount: 100,
      occurred_on: "2026-09-01",
    });
    expect(result.success).toBe(false);
  });

  it("coerces a numeric string amount to a number", () => {
    const result = transactionSchema.safeParse({
      type: "income",
      amount: "2500.50",
      occurred_on: "2026-09-01",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.amount).toBe(2500.5);
  });
});
