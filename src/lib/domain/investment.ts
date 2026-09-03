export interface InvestmentGainLoss {
  amount: number;
  percent: number | null;
}

/** Absolute and percentage gain/loss vs. amount invested. Percent is null when nothing was invested. */
export function computeGainLoss(amountInvested: number, currentValue: number): InvestmentGainLoss {
  const amount = currentValue - amountInvested;
  const percent = amountInvested > 0 ? (amount / amountInvested) * 100 : null;
  return { amount, percent };
}

export interface InvestmentSummaryInput {
  amountInvested: number;
  currentValue: number;
}

export interface InvestmentSummary {
  totalInvested: number;
  totalCurrentValue: number;
  gainLoss: InvestmentGainLoss;
}

export function computeInvestmentSummary(investments: InvestmentSummaryInput[]): InvestmentSummary {
  const totalInvested = investments.reduce((sum, i) => sum + i.amountInvested, 0);
  const totalCurrentValue = investments.reduce((sum, i) => sum + i.currentValue, 0);
  return {
    totalInvested,
    totalCurrentValue,
    gainLoss: computeGainLoss(totalInvested, totalCurrentValue),
  };
}

export const DEFAULT_INVESTMENT_TYPES = ["Stocks", "Mutual Fund", "Fixed Deposit", "Crypto", "Other"];

/**
 * Investment types used to be a fixed snake_case enum (e.g. "mutual_fund");
 * now they're free text. This keeps old rows displaying nicely without a
 * data migration: "mutual_fund" -> "Mutual Fund", "stocks" -> "Stocks".
 */
export function humanizeInvestmentType(type: string): string {
  return type
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/** Merges the default type suggestions with the user's own past custom types, deduped case-insensitively. */
export function mergeInvestmentTypes(customTypes: string[]): string[] {
  const seen = new Map<string, string>();
  for (const t of [...DEFAULT_INVESTMENT_TYPES, ...customTypes.map(humanizeInvestmentType)]) {
    const key = t.toLowerCase();
    if (!seen.has(key)) seen.set(key, t);
  }
  return Array.from(seen.values());
}
