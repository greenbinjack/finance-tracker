import { describe, it, expect } from "vitest";
import { eventSchema } from "./event";

describe("eventSchema", () => {
  it("accepts a valid event with a budget and date range", () => {
    const result = eventSchema.safeParse({
      name: "Cox's Bazar Trip",
      budget_amount: 15000,
      start_date: "2026-10-01",
      end_date: "2026-10-05",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an end date before the start date", () => {
    const result = eventSchema.safeParse({
      name: "Weekend Trip",
      start_date: "2026-10-05",
      end_date: "2026-10-01",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty name", () => {
    const result = eventSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("allows an event with no dates at all", () => {
    const result = eventSchema.safeParse({ name: "Office Party" });
    expect(result.success).toBe(true);
  });

  it("normalizes blank date fields (from empty date inputs) to undefined, not empty strings", () => {
    // Regression: Postgres rejects "" for a `date` column, and an unfilled
    // <input type="date"> submits "" not undefined.
    const result = eventSchema.safeParse({ name: "Office Party", start_date: "", end_date: "" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.start_date).toBeUndefined();
      expect(result.data.end_date).toBeUndefined();
    }
  });
});
