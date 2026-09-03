import { describe, it, expect } from "vitest";
import { formatCurrency, formatDate, formatDateShort } from "./format";

describe("formatCurrency", () => {
  it("formats a positive amount with the default BDT currency", () => {
    expect(formatCurrency(1500)).toContain("1,500");
  });

  it("rounds to whole units (no decimals)", () => {
    expect(formatCurrency(1500.75)).not.toContain(".75");
  });

  it("formats zero", () => {
    expect(formatCurrency(0)).toContain("0");
  });

  it("supports a different currency code", () => {
    const usd = formatCurrency(100, "USD");
    expect(usd).toContain("100");
  });
});

describe("formatDate / formatDateShort", () => {
  it("formats a date string as a readable date", () => {
    expect(formatDate("2026-09-01")).toMatch(/2026/);
  });

  it("formats a short date without the year", () => {
    expect(formatDateShort("2026-09-01")).not.toMatch(/2026/);
  });
});
