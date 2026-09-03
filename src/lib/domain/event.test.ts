import { describe, it, expect } from "vitest";
import {
  computeEventBudgetStatus,
  canReduceScheduledAmount,
  canChangeScheduledType,
  isOwnMoney,
  computeTotalJourneyMoney,
} from "./event";

describe("computeEventBudgetStatus", () => {
  it("computes remaining and percent used when under budget", () => {
    const result = computeEventBudgetStatus(3000, 10000);
    expect(result.remaining).toBe(7000);
    expect(result.percentUsed).toBe(30);
    expect(result.isOverBudget).toBe(false);
  });

  it("flags over-budget spend", () => {
    const result = computeEventBudgetStatus(12000, 10000);
    expect(result.remaining).toBe(-2000);
    expect(result.percentUsed).toBe(120);
    expect(result.isOverBudget).toBe(true);
  });

  it("returns nulls for percent/remaining when there's no budget", () => {
    const result = computeEventBudgetStatus(500, null);
    expect(result.remaining).toBeNull();
    expect(result.percentUsed).toBeNull();
    expect(result.isOverBudget).toBe(false);
  });

  it("treats a 0 budget the same as no budget (avoids divide-by-zero)", () => {
    const result = computeEventBudgetStatus(500, 0);
    expect(result.percentUsed).toBeNull();
    expect(result.isOverBudget).toBe(false);
  });
});

describe("canReduceScheduledAmount", () => {
  it("rejects dropping the planned amount below what's already fulfilled", () => {
    // Regression test: editing a ৳5,000 plan down to ৳1,000 after ৳2,000 was
    // already recorded against it was silently accepted — this must never happen.
    expect(canReduceScheduledAmount(1000, 2000)).toBe(false);
  });

  it("allows dropping to exactly the fulfilled amount", () => {
    expect(canReduceScheduledAmount(2000, 2000)).toBe(true);
  });

  it("allows increasing the planned amount", () => {
    expect(canReduceScheduledAmount(6000, 2000)).toBe(true);
  });

  it("allows any positive amount when nothing has been fulfilled yet", () => {
    expect(canReduceScheduledAmount(1, 0)).toBe(true);
  });
});

describe("canChangeScheduledType", () => {
  it("rejects changing type once anything has been fulfilled against it", () => {
    // A linked transaction already recorded a real type — flipping the plan
    // afterward would make it describe something different from what happened.
    expect(canChangeScheduledType(2000)).toBe(false);
  });

  it("allows changing type when nothing has been fulfilled yet", () => {
    expect(canChangeScheduledType(0)).toBe(true);
  });
});

describe("isOwnMoney", () => {
  it("is true when Myself gave it and it's not external", () => {
    expect(isOwnMoney(null, false)).toBe(true);
  });

  it("is false when a participant gave it", () => {
    expect(isOwnMoney("rafi", false)).toBe(false);
  });

  it("is false when it's external funding, even though paid_by is null like Myself", () => {
    // Regression risk: external money reuses null for paid_by_participant_id
    // (same as Myself) — the is_external flag is what must distinguish them.
    expect(isOwnMoney(null, true)).toBe(false);
  });
});

describe("computeTotalJourneyMoney", () => {
  it("adds actual given money to what's still planned", () => {
    const total = computeTotalJourneyMoney([{ amount: 4350 }, { amount: 500 }], [{ remaining: 5000 }]);
    expect(total).toBe(9850);
  });

  it("does not double-count a partially fulfilled plan", () => {
    // ৳5,000 planned, ৳2,000 of it fulfilled (now inside the transaction list)
    // — the plan's own remaining is ৳3,000, so the total shouldn't move.
    const before = computeTotalJourneyMoney([{ amount: 4850 }], [{ remaining: 5000 }]);
    const after = computeTotalJourneyMoney([{ amount: 4850 }, { amount: 2000 }], [{ remaining: 3000 }]);
    expect(before).toBe(9850);
    expect(after).toBe(9850);
  });

  it("equals actual given money alone once every plan is fully fulfilled", () => {
    const total = computeTotalJourneyMoney([{ amount: 9850 }], [{ remaining: 0 }]);
    expect(total).toBe(9850);
  });

  it("returns 0 for a trip with no money and nothing planned", () => {
    expect(computeTotalJourneyMoney([], [])).toBe(0);
  });

  it("includes external contributions even though they're excluded from the balance table", () => {
    // Regression: this used to be fed only the balance table's per-participant
    // totals, which deliberately exclude external funding — so an external
    // gift made "total journey money" go DOWN relative to "already expended",
    // which is incoherent. It must count here even though it's not split.
    const total = computeTotalJourneyMoney(
      [{ amount: 4100 }, { amount: 3000 }], // 3000 of this is external
      [],
    );
    expect(total).toBe(7100);
  });
});
