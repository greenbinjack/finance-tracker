import { describe, it, expect } from "vitest";
import { toCsv } from "./csv";

describe("toCsv", () => {
  const columns = [
    { header: "Name", value: (r: { name: string; amount: number }) => r.name },
    { header: "Amount", value: (r: { name: string; amount: number }) => r.amount },
  ];

  it("builds a header row plus one row per record", () => {
    const csv = toCsv(
      [
        { name: "Rent", amount: 5000 },
        { name: "Food", amount: 200 },
      ],
      columns,
    );
    expect(csv).toBe("Name,Amount\r\nRent,5000\r\nFood,200");
  });

  it("quotes fields containing a comma", () => {
    const csv = toCsv([{ name: "Coffee, Tea", amount: 100 }], columns);
    expect(csv).toBe('Name,Amount\r\n"Coffee, Tea",100');
  });

  it("escapes embedded quotes by doubling them", () => {
    const csv = toCsv([{ name: 'The "Big" Purchase', amount: 100 }], columns);
    expect(csv).toBe('Name,Amount\r\n"The ""Big"" Purchase",100');
  });

  it("quotes fields containing a newline", () => {
    const csv = toCsv([{ name: "Line1\nLine2", amount: 100 }], columns);
    expect(csv).toBe('Name,Amount\r\n"Line1\nLine2",100');
  });

  it("renders null/undefined values as an empty field", () => {
    const csv = toCsv([{ name: null as unknown as string, amount: undefined as unknown as number }], columns);
    expect(csv).toBe("Name,Amount\r\n,");
  });

  it("returns just the header row for an empty dataset", () => {
    expect(toCsv([], columns)).toBe("Name,Amount");
  });
});
