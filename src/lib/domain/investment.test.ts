import { describe, it, expect } from "vitest";
import {
  computeGainLoss,
  computeInvestmentSummary,
  humanizeInvestmentType,
  mergeInvestmentTypes,
} from "./investment";

describe("computeGainLoss", () => {
  it("computes a positive gain", () => {
    const result = computeGainLoss(1000, 1250);
    expect(result.amount).toBe(250);
    expect(result.percent).toBe(25);
  });

  it("computes a loss", () => {
    const result = computeGainLoss(1000, 800);
    expect(result.amount).toBe(-200);
    expect(result.percent).toBe(-20);
  });

  it("returns 0 gain when value is unchanged", () => {
    const result = computeGainLoss(1000, 1000);
    expect(result.amount).toBe(0);
    expect(result.percent).toBe(0);
  });

  it("returns null percent when nothing was invested", () => {
    const result = computeGainLoss(0, 500);
    expect(result.percent).toBeNull();
    expect(result.amount).toBe(500);
  });
});

describe("computeInvestmentSummary", () => {
  it("sums invested and current value across investments", () => {
    const result = computeInvestmentSummary([
      { amountInvested: 1000, currentValue: 1200 },
      { amountInvested: 500, currentValue: 400 },
    ]);
    expect(result.totalInvested).toBe(1500);
    expect(result.totalCurrentValue).toBe(1600);
    expect(result.gainLoss.amount).toBe(100);
  });

  it("handles an empty portfolio", () => {
    const result = computeInvestmentSummary([]);
    expect(result.totalInvested).toBe(0);
    expect(result.totalCurrentValue).toBe(0);
    expect(result.gainLoss.percent).toBeNull();
  });
});

describe("humanizeInvestmentType", () => {
  it("turns a legacy snake_case value into a readable label", () => {
    expect(humanizeInvestmentType("mutual_fund")).toBe("Mutual Fund");
    expect(humanizeInvestmentType("fixed_deposit")).toBe("Fixed Deposit");
  });

  it("title-cases a plain word", () => {
    expect(humanizeInvestmentType("stocks")).toBe("Stocks");
    expect(humanizeInvestmentType("CRYPTO")).toBe("Crypto");
  });

  it("leaves an already-nice custom label essentially as-is", () => {
    expect(humanizeInvestmentType("Real Estate")).toBe("Real Estate");
  });
});

describe("mergeInvestmentTypes", () => {
  it("includes all defaults when there are no custom types", () => {
    expect(mergeInvestmentTypes([])).toEqual([
      "Stocks",
      "Mutual Fund",
      "Fixed Deposit",
      "Crypto",
      "Other",
    ]);
  });

  it("appends a genuinely new custom type after the defaults", () => {
    const result = mergeInvestmentTypes(["Real Estate"]);
    expect(result).toContain("Real Estate");
    expect(result.indexOf("Real Estate")).toBe(5);
  });

  it("does not duplicate a custom type that matches a default case-insensitively", () => {
    const result = mergeInvestmentTypes(["stocks", "crypto"]);
    expect(result.filter((t) => t.toLowerCase() === "stocks")).toHaveLength(1);
  });
});
