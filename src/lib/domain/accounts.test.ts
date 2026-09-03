import { describe, it, expect } from "vitest";
import { computeAccountBalances } from "./accounts";

describe("computeAccountBalances", () => {
  it("nets income minus expense per account", () => {
    const result = computeAccountBalances(
      [{ id: "cash", name: "Cash" }],
      [
        { accountId: "cash", type: "income", amount: 20000 },
        { accountId: "cash", type: "expense", amount: 450 },
        { accountId: "cash", type: "expense", amount: 23 },
      ],
    );
    expect(result.accounts).toEqual([{ id: "cash", name: "Cash", balance: 19527 }]);
    expect(result.total).toBe(19527);
  });

  it("keeps unassigned (no-account) transactions separate but still counted in the total", () => {
    const result = computeAccountBalances(
      [{ id: "cash", name: "Cash" }],
      [
        { accountId: "cash", type: "income", amount: 1000 },
        { accountId: null, type: "expense", amount: 200 },
      ],
    );
    expect(result.accounts[0].balance).toBe(1000);
    expect(result.unassigned).toBe(-200);
    expect(result.total).toBe(800);
  });

  it("gives an account with no transactions a zero balance, not undefined", () => {
    const result = computeAccountBalances([{ id: "cash", name: "Cash" }], []);
    expect(result.accounts).toEqual([{ id: "cash", name: "Cash", balance: 0 }]);
    expect(result.total).toBe(0);
  });

  it("sums correctly across multiple accounts", () => {
    const result = computeAccountBalances(
      [
        { id: "cash", name: "Cash" },
        { id: "bank", name: "Bank" },
      ],
      [
        { accountId: "cash", type: "income", amount: 500 },
        { accountId: "bank", type: "income", amount: 10000 },
        { accountId: "bank", type: "expense", amount: 2500 },
      ],
    );
    expect(result.accounts).toEqual([
      { id: "cash", name: "Cash", balance: 500 },
      { id: "bank", name: "Bank", balance: 7500 },
    ]);
    expect(result.total).toBe(8000);
  });

  it("moves a transfer's amount from the source account to the destination", () => {
    const result = computeAccountBalances(
      [
        { id: "cash", name: "Cash" },
        { id: "bank", name: "Bank" },
      ],
      [
        { accountId: "cash", type: "income", amount: 1000 },
        { accountId: "cash", toAccountId: "bank", type: "transfer", amount: 400 },
      ],
    );
    expect(result.accounts).toEqual([
      { id: "cash", name: "Cash", balance: 600 },
      { id: "bank", name: "Bank", balance: 400 },
    ]);
  });

  it("leaves the grand total unchanged by a transfer between two real accounts", () => {
    const result = computeAccountBalances(
      [
        { id: "cash", name: "Cash" },
        { id: "bank", name: "Bank" },
      ],
      [
        { accountId: "cash", type: "income", amount: 1000 },
        { accountId: "cash", toAccountId: "bank", type: "transfer", amount: 400 },
      ],
    );
    expect(result.total).toBe(1000);
  });

  it("handles a transfer touching the unassigned bucket on either side", () => {
    const result = computeAccountBalances(
      [{ id: "cash", name: "Cash" }],
      [
        { accountId: "cash", type: "income", amount: 1000 },
        { accountId: "cash", toAccountId: null, type: "transfer", amount: 300 },
      ],
    );
    expect(result.accounts[0].balance).toBe(700);
    expect(result.unassigned).toBe(300);
    expect(result.total).toBe(1000);
  });
});
