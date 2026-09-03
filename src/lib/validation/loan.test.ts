import { describe, it, expect } from "vitest";
import { loanSchema, loanPaymentSchema } from "./loan";

describe("loanSchema", () => {
  it("accepts a valid loan given to someone", () => {
    const result = loanSchema.safeParse({
      person_name: "Rafi",
      direction: "given",
      principal_amount: 5000,
      date_of_loan: "2026-09-01",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a non-positive principal", () => {
    const result = loanSchema.safeParse({
      person_name: "Rafi",
      direction: "given",
      principal_amount: 0,
      date_of_loan: "2026-09-01",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid direction", () => {
    const result = loanSchema.safeParse({
      person_name: "Rafi",
      direction: "sideways",
      principal_amount: 100,
      date_of_loan: "2026-09-01",
    });
    expect(result.success).toBe(false);
  });

  it("normalizes a blank due_date (from an empty date input) to undefined, not an empty string", () => {
    // Regression: Postgres rejects "" for a `date` column ("invalid input syntax
    // for type date"), and an unfilled <input type="date"> submits "" not undefined.
    const result = loanSchema.safeParse({
      person_name: "Rafi",
      direction: "given",
      principal_amount: 5000,
      date_of_loan: "2026-09-01",
      due_date: "",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.due_date).toBeUndefined();
  });

  it("keeps a real due_date value", () => {
    const result = loanSchema.safeParse({
      person_name: "Rafi",
      direction: "given",
      principal_amount: 5000,
      date_of_loan: "2026-09-01",
      due_date: "2026-10-01",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.due_date).toBe("2026-10-01");
  });
});

describe("loanPaymentSchema", () => {
  it("accepts a valid partial payment", () => {
    const result = loanPaymentSchema.safeParse({
      loan_id: "123e4567-e89b-12d3-a456-426614174000",
      amount: 1000,
      paid_on: "2026-09-01",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a non-UUID loan_id", () => {
    const result = loanPaymentSchema.safeParse({
      loan_id: "not-a-uuid",
      amount: 1000,
      paid_on: "2026-09-01",
    });
    expect(result.success).toBe(false);
  });
});
