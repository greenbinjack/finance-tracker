import { describe, it, expect } from "vitest";
import { settlementSchema, eventExpenseSchema, scheduledItemSchema } from "./split";

const RAFI = "3fa85f64-5717-4562-b3fc-2c963f66afa6";
const KARIM = "550e8400-e29b-41d4-a716-446655440000";

describe("settlementSchema", () => {
  it("accepts a participant paying Myself", () => {
    const result = settlementSchema.safeParse({
      from_participant_id: RAFI,
      to_participant_id: null,
      amount: 1925,
      settled_on: "2026-09-01",
    });
    expect(result.success).toBe(true);
  });

  it("accepts Myself paying a participant", () => {
    const result = settlementSchema.safeParse({
      from_participant_id: null,
      to_participant_id: RAFI,
      amount: 500,
      settled_on: "2026-09-01",
    });
    expect(result.success).toBe(true);
  });

  it("accepts two different participants settling directly, Myself uninvolved", () => {
    const result = settlementSchema.safeParse({
      from_participant_id: RAFI,
      to_participant_id: KARIM,
      amount: 500,
      settled_on: "2026-09-01",
    });
    expect(result.success).toBe(true);
  });

  it("rejects the same participant on both sides", () => {
    const result = settlementSchema.safeParse({
      from_participant_id: RAFI,
      to_participant_id: RAFI,
      amount: 500,
      settled_on: "2026-09-01",
    });
    expect(result.success).toBe(false);
  });

  it("rejects Myself on both sides (both null)", () => {
    // The DB's own check constraint mirrors this, but the app should catch
    // a nonsensical Myself-to-Myself settlement before it ever reaches SQL.
    const result = settlementSchema.safeParse({
      from_participant_id: null,
      to_participant_id: null,
      amount: 500,
      settled_on: "2026-09-01",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a zero or negative amount", () => {
    expect(
      settlementSchema.safeParse({
        from_participant_id: RAFI,
        to_participant_id: null,
        amount: 0,
        settled_on: "2026-09-01",
      }).success,
    ).toBe(false);
    expect(
      settlementSchema.safeParse({
        from_participant_id: RAFI,
        to_participant_id: null,
        amount: -100,
        settled_on: "2026-09-01",
      }).success,
    ).toBe(false);
  });

  it("rejects a missing settled_on date", () => {
    const result = settlementSchema.safeParse({
      from_participant_id: RAFI,
      to_participant_id: null,
      amount: 500,
      settled_on: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("eventExpenseSchema", () => {
  it("accepts a valid expense given by Myself (null)", () => {
    const result = eventExpenseSchema.safeParse({
      type: "expense",
      amount: 3500,
      occurred_on: "2026-09-01",
      paid_by_participant_id: null,
    });
    expect(result.success).toBe(true);
  });

  it("accepts a valid income given by a participant", () => {
    const result = eventExpenseSchema.safeParse({
      type: "income",
      amount: 3000,
      occurred_on: "2026-09-01",
      paid_by_participant_id: RAFI,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a zero or negative amount", () => {
    const result = eventExpenseSchema.safeParse({
      type: "expense",
      amount: 0,
      occurred_on: "2026-09-01",
      paid_by_participant_id: null,
    });
    expect(result.success).toBe(false);
  });

  it("accepts external funding (paid_by null, is_external true)", () => {
    const result = eventExpenseSchema.safeParse({
      type: "expense",
      amount: 5000,
      occurred_on: "2026-09-01",
      paid_by_participant_id: null,
      is_external: true,
    });
    expect(result.success).toBe(true);
  });

  it("rejects external funding attributed to a participant at the same time", () => {
    const result = eventExpenseSchema.safeParse({
      type: "expense",
      amount: 5000,
      occurred_on: "2026-09-01",
      paid_by_participant_id: RAFI,
      is_external: true,
    });
    expect(result.success).toBe(false);
  });

  it("requires paid_by_participant_id to be present (null for Myself, not omitted)", () => {
    const result = eventExpenseSchema.safeParse({
      type: "expense",
      amount: 100,
      occurred_on: "2026-09-01",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid type", () => {
    const result = eventExpenseSchema.safeParse({
      type: "transfer",
      amount: 100,
      occurred_on: "2026-09-01",
      paid_by_participant_id: null,
    });
    expect(result.success).toBe(false);
  });

  it("allows scheduled_item_id to be omitted (a normal, unlinked entry)", () => {
    const result = eventExpenseSchema.safeParse({
      type: "expense",
      amount: 100,
      occurred_on: "2026-09-01",
      paid_by_participant_id: null,
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.scheduled_item_id).toBeUndefined();
  });
});

describe("scheduledItemSchema", () => {
  it("accepts a valid planned expense", () => {
    const result = scheduledItemSchema.safeParse({ type: "expense", amount: 5000, note: "Hotel" });
    expect(result.success).toBe(true);
  });

  it("accepts a planned item with no note", () => {
    const result = scheduledItemSchema.safeParse({ type: "income", amount: 3000 });
    expect(result.success).toBe(true);
  });

  it("rejects a zero or negative planned amount", () => {
    expect(scheduledItemSchema.safeParse({ type: "expense", amount: 0 }).success).toBe(false);
    expect(scheduledItemSchema.safeParse({ type: "expense", amount: -50 }).success).toBe(false);
  });
});
