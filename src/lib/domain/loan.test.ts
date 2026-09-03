import { describe, it, expect } from "vitest";
import { computeLoanStatus, remainingBalance, computeLoanUrgency, computeAccruedInterest } from "./loan";

describe("computeLoanStatus", () => {
  it("is open when nothing has been paid", () => {
    expect(computeLoanStatus(1000, 0)).toBe("open");
  });

  it("is partly_paid when some but not all has been paid", () => {
    expect(computeLoanStatus(1000, 400)).toBe("partly_paid");
  });

  it("is settled when the full principal has been paid", () => {
    expect(computeLoanStatus(1000, 1000)).toBe("settled");
  });

  it("is settled when overpaid", () => {
    expect(computeLoanStatus(1000, 1200)).toBe("settled");
  });
});

describe("remainingBalance", () => {
  it("returns the unpaid amount", () => {
    expect(remainingBalance(1000, 400)).toBe(600);
  });

  it("never goes negative when overpaid", () => {
    expect(remainingBalance(1000, 1500)).toBe(0);
  });
});

describe("computeLoanUrgency", () => {
  const today = "2026-09-03";

  it("is overdue when the due date has already passed", () => {
    expect(computeLoanUrgency("2026-09-02", "open", today)).toBe("overdue");
  });

  it("is due_soon when the due date is today", () => {
    expect(computeLoanUrgency("2026-09-03", "open", today)).toBe("due_soon");
  });

  it("is due_soon when within the default 7-day window", () => {
    expect(computeLoanUrgency("2026-09-10", "open", today)).toBe("due_soon");
  });

  it("is none when beyond the default 7-day window", () => {
    expect(computeLoanUrgency("2026-09-11", "open", today)).toBe("none");
  });

  it("is none when there's no due date", () => {
    expect(computeLoanUrgency(null, "open", today)).toBe("none");
  });

  it("is none for a settled loan even if overdue", () => {
    expect(computeLoanUrgency("2026-08-01", "settled", today)).toBe("none");
  });

  it("respects a custom due-soon window", () => {
    expect(computeLoanUrgency("2026-09-05", "open", today, 1)).toBe("none");
    expect(computeLoanUrgency("2026-09-04", "open", today, 1)).toBe("due_soon");
  });
});

describe("computeAccruedInterest", () => {
  it("computes simple interest for a full year", () => {
    expect(computeAccruedInterest(10000, 10, "2025-09-03", "2026-09-03")).toBeCloseTo(1000, 0);
  });

  it("computes proportional interest for half a year", () => {
    expect(computeAccruedInterest(10000, 10, "2026-03-05", "2026-09-05")).toBeCloseTo(500, -1);
  });

  it("returns 0 for a null rate", () => {
    expect(computeAccruedInterest(10000, null, "2025-09-03", "2026-09-03")).toBe(0);
  });

  it("returns 0 for a zero or negative rate", () => {
    expect(computeAccruedInterest(10000, 0, "2025-09-03", "2026-09-03")).toBe(0);
    expect(computeAccruedInterest(10000, -5, "2025-09-03", "2026-09-03")).toBe(0);
  });

  it("returns 0 when the as-of date is before the loan date", () => {
    expect(computeAccruedInterest(10000, 10, "2026-09-03", "2026-01-01")).toBe(0);
  });

  it("returns 0 on the loan date itself", () => {
    expect(computeAccruedInterest(10000, 10, "2026-09-03", "2026-09-03")).toBe(0);
  });
});
