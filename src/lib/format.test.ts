import { describe, it, expect } from "vitest";
import { formatCurrency, formatDate, formatDateShort, toLocalDateString } from "./format";

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

describe("toLocalDateString", () => {
  it("formats a date using its local-timezone components", () => {
    const d = new Date(2026, 8, 4); // month is 0-indexed: September 4, 2026
    expect(toLocalDateString(d)).toBe("2026-09-04");
  });

  it("pads single-digit months and days", () => {
    const d = new Date(2026, 0, 5); // January 5, 2026
    expect(toLocalDateString(d)).toBe("2026-01-05");
  });

  it("does not shift the date based on UTC, unlike toISOString", () => {
    // Local midnight is a different UTC day for any timezone offset from UTC,
    // which is exactly the bug this function exists to avoid.
    const d = new Date(2026, 8, 4, 0, 30); // Sep 4, 00:30 local
    expect(toLocalDateString(d)).toBe("2026-09-04");
  });
});
