import { describe, it, expect } from "vitest";
import { computeContributionBalances, computeSplitBalances } from "./split";

describe("computeContributionBalances", () => {
  it("splits a trip's total evenly and shows who overpaid vs underpaid", () => {
    // Myself gave 10000, Rafi gave 3000, Karim gave 2000 — total 15000 / 3 = 5000 average.
    const { average, balances } = computeContributionBalances(
      [null, "rafi", "karim"],
      [
        { participantId: null, amount: 10000 },
        { participantId: "rafi", amount: 3000 },
        { participantId: "karim", amount: 2000 },
      ],
      [],
    );

    expect(average).toBe(5000);
    expect(balances).toEqual([
      { participantId: null, totalGiven: 10000, netGiven: 10000, balance: 5000 },
      { participantId: "rafi", totalGiven: 3000, netGiven: 3000, balance: -2000 },
      { participantId: "karim", totalGiven: 2000, netGiven: 2000, balance: -3000 },
    ]);
  });

  it("sums both expense and income contributions from the same person", () => {
    const { balances } = computeContributionBalances(
      [null, "rafi"],
      [
        { participantId: "rafi", amount: 1000 },
        { participantId: "rafi", amount: 500 },
      ],
      [],
    );
    expect(balances.find((b) => b.participantId === "rafi")?.totalGiven).toBe(1500);
  });

  it("a settlement moves credit from payer to receiver without changing the average", () => {
    const { average, balances } = computeContributionBalances(
      [null, "rafi", "karim"],
      [
        { participantId: null, amount: 10000 },
        { participantId: "rafi", amount: 3000 },
        { participantId: "karim", amount: 2000 },
      ],
      [{ fromParticipantId: "rafi", toParticipantId: null, amount: 2000 }],
    );

    expect(average).toBe(5000); // unchanged — settlements don't affect the trip's total cost
    expect(balances.find((b) => b.participantId === "rafi")).toEqual({
      participantId: "rafi",
      totalGiven: 3000,
      netGiven: 5000,
      balance: 0,
    });
    expect(balances.find((b) => b.participantId === null)).toEqual({
      participantId: null,
      totalGiven: 10000,
      netGiven: 8000,
      balance: 3000,
    });
    // Karim hasn't settled — still owes.
    expect(balances.find((b) => b.participantId === "karim")?.balance).toBe(-3000);
  });

  it("a participant-to-participant settlement (Myself uninvolved) still nets correctly", () => {
    const { balances } = computeContributionBalances(
      [null, "rafi", "karim"],
      [
        { participantId: "rafi", amount: 4000 },
        { participantId: "karim", amount: 0 },
      ],
      [{ fromParticipantId: "karim", toParticipantId: "rafi", amount: 2000 }],
    );
    // karim (owing) pays rafi (overpaid) 2000 — karim's net rises toward the
    // average, rafi's falls back toward it, both converging on 2000.
    expect(balances.find((b) => b.participantId === "rafi")?.netGiven).toBe(2000);
    expect(balances.find((b) => b.participantId === "karim")?.netGiven).toBe(2000);
  });

  it("returns zeroed balances and a zero average when nobody has given anything", () => {
    const { average, balances } = computeContributionBalances([null, "rafi"], [], []);
    expect(average).toBe(0);
    expect(balances).toEqual([
      { participantId: null, totalGiven: 0, netGiven: 0, balance: 0 },
      { participantId: "rafi", totalGiven: 0, netGiven: 0, balance: 0 },
    ]);
  });

  it("returns an empty balances list and zero average for no participants", () => {
    const { average, balances } = computeContributionBalances([], [], []);
    expect(average).toBe(0);
    expect(balances).toEqual([]);
  });

  it("external funding (excluded upstream by the caller) shrinks the average without being attributed to anyone", () => {
    // Trip costs 15000 total; father externally covers 5000 of it, so only
    // the remaining 10000 should be split — the caller is responsible for
    // filtering out external contributions before they ever reach here.
    const { average, balances } = computeContributionBalances(
      [null, "rafi", "karim"],
      [
        { participantId: null, amount: 10000 }, // the 5000 external portion is never passed in
        { participantId: "rafi", amount: 0 },
        { participantId: "karim", amount: 0 },
      ],
      [],
    );
    expect(average).toBe(10000 / 3);
    expect(balances.find((b) => b.participantId === "rafi")?.balance).toBeCloseTo(-10000 / 3, 10);
  });
});

describe("computeSplitBalances", () => {
  it("matches computeContributionBalances exactly when no transaction has a custom split", () => {
    const participantIds = [null, "rafi", "karim"];
    const contributions = [
      { participantId: null, amount: 10000 },
      { participantId: "rafi", amount: 3000 },
      { participantId: "karim", amount: 2000 },
    ];
    const settlements = [{ fromParticipantId: "rafi", toParticipantId: null, amount: 1000 }];

    const legacy = computeContributionBalances(participantIds, contributions, settlements);
    const generalized = computeSplitBalances(
      participantIds,
      contributions.map((c) => ({ participantId: c.participantId, amount: c.amount })),
      settlements,
    );

    // Summing per-transaction equal shares (generalized) vs. one division
    // (legacy) can differ by float epsilon, so compare numerically rather
    // than with a strict deep-equal.
    expect(generalized.average).toBeCloseTo(legacy.average, 8);
    expect(generalized.balances).toHaveLength(legacy.balances.length);
    generalized.balances.forEach((b, i) => {
      expect(b.participantId).toBe(legacy.balances[i].participantId);
      expect(b.totalGiven).toBeCloseTo(legacy.balances[i].totalGiven, 8);
      expect(b.netGiven).toBeCloseTo(legacy.balances[i].netGiven, 8);
      expect(b.balance).toBeCloseTo(legacy.balances[i].balance, 8);
    });
  });

  it("charges a custom split only to the participants named in it", () => {
    // A 1000 taxi ride split 60/40 between Myself and Rafi only — Karim,
    // also in the trip, owes nothing toward this specific expense.
    const { balances } = computeSplitBalances(
      [null, "rafi", "karim"],
      [
        {
          participantId: null, // Myself paid the taxi
          amount: 1000,
          splits: [
            { participantId: null, amount: 600 },
            { participantId: "rafi", amount: 400 },
          ],
        },
      ],
      [],
    );

    expect(balances.find((b) => b.participantId === null)?.balance).toBe(400); // paid 1000, owed 600
    expect(balances.find((b) => b.participantId === "rafi")?.balance).toBe(-400); // paid 0, owed 400
    expect(balances.find((b) => b.participantId === "karim")?.balance).toBe(0); // not in the split at all
  });

  it("mixes custom-split and equal-split transactions correctly", () => {
    const { balances } = computeSplitBalances(
      [null, "rafi"],
      [
        // Custom: Myself paid 1000, split 800/200.
        {
          participantId: null,
          amount: 1000,
          splits: [
            { participantId: null, amount: 800 },
            { participantId: "rafi", amount: 200 },
          ],
        },
        // Equal (no splits given): Rafi paid 500, defaults to a 250/250 split.
        { participantId: "rafi", amount: 500 },
      ],
      [],
    );

    // Myself: paid 1000, owed 800 (custom) + 250 (equal) = 1050 -> balance -50.
    expect(balances.find((b) => b.participantId === null)?.balance).toBe(-50);
    // Rafi: paid 500, owed 200 (custom) + 250 (equal) = 450 -> balance 50.
    expect(balances.find((b) => b.participantId === "rafi")?.balance).toBe(50);
  });
});
