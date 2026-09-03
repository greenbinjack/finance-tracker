import { describe, it, expect } from "vitest";
import { parseCsvRows, parseTransactionsCsv } from "./csv-import";

describe("parseCsvRows", () => {
  it("splits a simple CSV", () => {
    expect(parseCsvRows("a,b,c\n1,2,3")).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("handles quoted fields with embedded commas and quotes", () => {
    expect(parseCsvRows('a,"b, with comma","c ""quoted"" word"\n')).toEqual([
      ["a", "b, with comma", 'c "quoted" word'],
    ]);
  });

  it("handles CRLF line endings", () => {
    expect(parseCsvRows("a,b\r\n1,2\r\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });
});

const categories = [
  { id: "cat-food", name: "Food", type: "expense" as const },
  { id: "cat-salary", name: "Salary", type: "income" as const },
];
const accounts = [{ id: "acc-cash", name: "Cash" }];

describe("parseTransactionsCsv", () => {
  it("parses valid rows and resolves category/account names to ids", () => {
    const csv = ["Date,Type,Amount,Category,Account,Note", "2026-01-05,expense,250,Food,Cash,Lunch"].join("\n");
    const result = parseTransactionsCsv(csv, categories, accounts);
    expect(result.errors).toEqual([]);
    expect(result.rows).toEqual([
      {
        occurred_on: "2026-01-05",
        type: "expense",
        amount: 250,
        category_id: "cat-food",
        account_id: "acc-cash",
        note: "Lunch",
      },
    ]);
  });

  it("allows category and account to be blank", () => {
    const csv = ["Date,Type,Amount", "2026-01-05,income,1000"].join("\n");
    const result = parseTransactionsCsv(csv, categories, accounts);
    expect(result.errors).toEqual([]);
    expect(result.rows[0].category_id).toBeNull();
    expect(result.rows[0].account_id).toBeNull();
  });

  it("reports a missing required column", () => {
    const csv = "Date,Amount\n2026-01-05,100";
    const result = parseTransactionsCsv(csv, categories, accounts);
    expect(result.rows).toEqual([]);
    expect(result.errors[0].message).toMatch(/Missing required column/);
  });

  it("reports an invalid date", () => {
    const csv = ["Date,Type,Amount", "01/05/2026,expense,100"].join("\n");
    const result = parseTransactionsCsv(csv, categories, accounts);
    expect(result.rows).toEqual([]);
    expect(result.errors[0].message).toMatch(/Invalid date/);
  });

  it("rejects transfer rows with a clear message", () => {
    const csv = ["Date,Type,Amount", "2026-01-05,transfer,100"].join("\n");
    const result = parseTransactionsCsv(csv, categories, accounts);
    expect(result.errors[0].message).toMatch(/Transfers aren't supported/);
  });

  it("reports a non-positive amount", () => {
    const csv = ["Date,Type,Amount", "2026-01-05,expense,0"].join("\n");
    const result = parseTransactionsCsv(csv, categories, accounts);
    expect(result.errors[0].message).toMatch(/Invalid amount/);
  });

  it("reports an unknown category", () => {
    const csv = ["Date,Type,Amount,Category", "2026-01-05,expense,100,Nonexistent"].join("\n");
    const result = parseTransactionsCsv(csv, categories, accounts);
    expect(result.errors[0].message).toMatch(/Unknown expense category/);
  });

  it("reports an unknown account", () => {
    const csv = ["Date,Type,Amount,Account", "2026-01-05,expense,100,Nonexistent"].join("\n");
    const result = parseTransactionsCsv(csv, categories, accounts);
    expect(result.errors[0].message).toMatch(/Unknown account/);
  });

  it("skips blank lines and reports correct 1-based line numbers", () => {
    const csv = ["Date,Type,Amount", "2026-01-05,expense,100", "", "not-a-date,expense,100"].join("\n");
    const result = parseTransactionsCsv(csv, categories, accounts);
    expect(result.rows).toHaveLength(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].line).toBe(4);
  });

  it("reports the file being empty", () => {
    const result = parseTransactionsCsv("", categories, accounts);
    expect(result.errors[0].message).toBe("The file is empty.");
  });
});
