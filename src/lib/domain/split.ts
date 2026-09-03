/**
 * Every participant in the money-tracking model below is identified by a
 * string id, or `null` for "Myself" — the app's user, who is always a
 * member of the group but is never a row in event_participants (there's
 * nothing to create or delete for them).
 */
export type ParticipantKey = string | null;

export interface ContributionInput {
  participantId: ParticipantKey;
  amount: number;
}

export interface SettlementTransferInput {
  fromParticipantId: ParticipantKey;
  toParticipantId: ParticipantKey;
  amount: number;
}

export interface ParticipantContributionBalance {
  participantId: ParticipantKey;
  /** Raw total of everything this person gave to the trip (expenses + income), before settlements. */
  totalGiven: number;
  /** totalGiven adjusted by settlements paid (+) and received (-). */
  netGiven: number;
  /** netGiven minus the fair share — positive means they're owed money back, negative means they owe. */
  balance: number;
}

/**
 * A trip's fair share is what everyone would have given if they'd
 * contributed equally: (everyone's total given) / (participant count,
 * Myself included). A settlement is a direct transfer between two parties
 * — it doesn't change the fair share (the trip's total cost is unchanged),
 * it just moves credit from the payer's net-given to the receiver's,
 * nudging both toward zero balance.
 */
export function computeContributionBalances(
  participantIds: ParticipantKey[],
  contributions: ContributionInput[],
  settlements: SettlementTransferInput[],
): { average: number; balances: ParticipantContributionBalance[] } {
  const totalGivenByParticipant = new Map<ParticipantKey, number>();
  for (const id of participantIds) totalGivenByParticipant.set(id, 0);
  for (const c of contributions) {
    totalGivenByParticipant.set(c.participantId, (totalGivenByParticipant.get(c.participantId) ?? 0) + c.amount);
  }

  const grandTotal = contributions.reduce((sum, c) => sum + c.amount, 0);
  const average = participantIds.length > 0 ? grandTotal / participantIds.length : 0;

  const settlementAdjustment = new Map<ParticipantKey, number>();
  for (const id of participantIds) settlementAdjustment.set(id, 0);
  for (const s of settlements) {
    settlementAdjustment.set(s.fromParticipantId, (settlementAdjustment.get(s.fromParticipantId) ?? 0) + s.amount);
    settlementAdjustment.set(s.toParticipantId, (settlementAdjustment.get(s.toParticipantId) ?? 0) - s.amount);
  }

  const balances = participantIds.map((participantId) => {
    const totalGiven = totalGivenByParticipant.get(participantId) ?? 0;
    const netGiven = totalGiven + (settlementAdjustment.get(participantId) ?? 0);
    return {
      participantId,
      totalGiven,
      netGiven,
      balance: netGiven - average,
    };
  });

  return { average, balances };
}

export interface SplitShareInput {
  participantId: ParticipantKey;
  amount: number;
}

export interface SplitTransactionInput {
  /** Who paid/contributed this amount. */
  participantId: ParticipantKey;
  amount: number;
  /** Custom cost split for this transaction. Omitted or empty = equal split among every participant (legacy default). */
  splits?: SplitShareInput[];
}

/**
 * Generalizes computeContributionBalances with optional per-transaction
 * custom splits (Splitwise-style: "only me and Rafi split this taxi,
 * 60/40"). A transaction with no `splits` falls back to exactly the old
 * behavior — its amount divided equally across every participant — so this
 * produces identical balances to computeContributionBalances whenever
 * nothing has a custom split.
 */
export function computeSplitBalances(
  participantIds: ParticipantKey[],
  transactions: SplitTransactionInput[],
  settlements: SettlementTransferInput[],
): { average: number; balances: ParticipantContributionBalance[] } {
  const paidByParticipant = new Map<ParticipantKey, number>();
  const owedByParticipant = new Map<ParticipantKey, number>();
  for (const id of participantIds) {
    paidByParticipant.set(id, 0);
    owedByParticipant.set(id, 0);
  }

  let grandTotal = 0;
  for (const t of transactions) {
    grandTotal += t.amount;
    paidByParticipant.set(t.participantId, (paidByParticipant.get(t.participantId) ?? 0) + t.amount);

    if (t.splits && t.splits.length > 0) {
      for (const s of t.splits) {
        owedByParticipant.set(s.participantId, (owedByParticipant.get(s.participantId) ?? 0) + s.amount);
      }
    } else if (participantIds.length > 0) {
      const equalShare = t.amount / participantIds.length;
      for (const id of participantIds) {
        owedByParticipant.set(id, (owedByParticipant.get(id) ?? 0) + equalShare);
      }
    }
  }

  const average = participantIds.length > 0 ? grandTotal / participantIds.length : 0;

  const settlementAdjustment = new Map<ParticipantKey, number>();
  for (const id of participantIds) settlementAdjustment.set(id, 0);
  for (const s of settlements) {
    settlementAdjustment.set(s.fromParticipantId, (settlementAdjustment.get(s.fromParticipantId) ?? 0) + s.amount);
    settlementAdjustment.set(s.toParticipantId, (settlementAdjustment.get(s.toParticipantId) ?? 0) - s.amount);
  }

  const balances = participantIds.map((participantId) => {
    const paid = paidByParticipant.get(participantId) ?? 0;
    const owed = owedByParticipant.get(participantId) ?? 0;
    const netGiven = paid + (settlementAdjustment.get(participantId) ?? 0);
    return {
      participantId,
      totalGiven: paid,
      netGiven,
      balance: netGiven - owed,
    };
  });

  return { average, balances };
}
