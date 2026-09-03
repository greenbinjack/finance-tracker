import { describe, it, expect } from "vitest";
import { isSubsequenceMatch } from "./search";

describe("isSubsequenceMatch", () => {
  it("matches an exact substring", () => {
    expect(isSubsequenceMatch("cerie", "Groceries")).toBe(true);
  });

  it("matches non-consecutive characters in order", () => {
    expect(isSubsequenceMatch("gcs", "Groceries")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(isSubsequenceMatch("GRO", "groceries")).toBe(true);
  });

  it("rejects characters out of order", () => {
    // "g" only appears before "c" in "Groceries" — this asks for it after.
    expect(isSubsequenceMatch("cgr", "Groceries")).toBe(false);
  });

  it("rejects a character not present at all", () => {
    expect(isSubsequenceMatch("groz", "Groceries")).toBe(false);
  });

  it("treats an empty query as matching everything", () => {
    expect(isSubsequenceMatch("", "anything")).toBe(true);
  });

  it("rejects a non-empty query against an empty target", () => {
    expect(isSubsequenceMatch("a", "")).toBe(false);
  });

  it("matches a query equal to the full target", () => {
    expect(isSubsequenceMatch("bus fare", "bus fare")).toBe(true);
  });
});
