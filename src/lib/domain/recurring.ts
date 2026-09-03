export interface RecurringCandidateInput {
  categoryId: string | null;
  accountId: string | null;
  amount: number;
  occurredOn: string;
  note: string | null;
}

export interface RecurringSuggestion {
  categoryId: string | null;
  accountId: string | null;
  amount: number;
  note: string | null;
  occurrences: number;
  lastOccurredOn: string;
  intervalDays: number;
  nextDueOn: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

// UTC throughout — local-time Date arithmetic drifts by a day around DST
// transitions, which would silently misdetect an otherwise-exact 30-day
// monthly interval.
function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b + "T00:00:00Z").getTime() - new Date(a + "T00:00:00Z").getTime()) / DAY_MS);
}

function addDays(date: string, days: number): string {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Finds expense patterns that repeat on a roughly weekly or monthly cadence
 * — same category + same amount, at least 3 times, with a consistent
 * interval (allowing +/-4 days of jitter for "same day each month" not
 * landing on the same weekday). Used to suggest "this looks due again"
 * quick-fills rather than to auto-create anything.
 */
export function detectRecurringTransactions(
  transactions: RecurringCandidateInput[],
  today: string,
): RecurringSuggestion[] {
  const groups = new Map<string, RecurringCandidateInput[]>();
  for (const t of transactions) {
    if (t.categoryId === null) continue; // uncategorized spend is too noisy a signal to group on
    const key = `${t.categoryId}|${t.amount}`;
    const list = groups.get(key) ?? [];
    list.push(t);
    groups.set(key, list);
  }

  const suggestions: RecurringSuggestion[] = [];

  for (const group of groups.values()) {
    if (group.length < 3) continue;
    const sorted = [...group].sort((a, b) => (a.occurredOn < b.occurredOn ? -1 : 1));

    const intervals: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      intervals.push(daysBetween(sorted[i - 1].occurredOn, sorted[i].occurredOn));
    }

    const avgInterval = intervals.reduce((s, x) => s + x, 0) / intervals.length;
    const isWeekly = avgInterval >= 5 && avgInterval <= 9;
    const isMonthly = avgInterval >= 26 && avgInterval <= 34;
    if (!isWeekly && !isMonthly) continue;

    const maxDeviation = Math.max(...intervals.map((i) => Math.abs(i - avgInterval)));
    const jitterTolerance = isMonthly ? 4 : 2;
    if (maxDeviation > jitterTolerance) continue;

    const last = sorted[sorted.length - 1];
    const nextDueOn = addDays(last.occurredOn, Math.round(avgInterval));

    // Only worth surfacing if it's actually due soon (within a week either
    // side of today) — a pattern due next month isn't a useful reminder yet.
    if (daysBetween(today, nextDueOn) > 7 || daysBetween(nextDueOn, today) > 7) continue;

    suggestions.push({
      categoryId: last.categoryId,
      accountId: last.accountId,
      amount: last.amount,
      note: last.note,
      occurrences: sorted.length,
      lastOccurredOn: last.occurredOn,
      intervalDays: Math.round(avgInterval),
      nextDueOn,
    });
  }

  return suggestions.sort((a, b) => (a.nextDueOn < b.nextDueOn ? -1 : 1));
}
