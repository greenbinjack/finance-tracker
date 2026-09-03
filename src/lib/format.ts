/**
 * A Date as YYYY-MM-DD, read from its local-timezone components — NOT
 * `date.toISOString().slice(0, 10)`, which reads UTC and is a day behind
 * for anyone east of UTC (e.g. Bangladesh, UTC+6) during the ~6 hours after
 * their local midnight but before UTC's. Safe to use both in the browser
 * (the user's own local time) and on the server (the server's local time).
 */
export function toLocalDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Today's date as YYYY-MM-DD — see {@link toLocalDateString}. */
export function todayLocalDate(): string {
  return toLocalDateString(new Date());
}

export function formatCurrency(amount: number, currency = "BDT") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(dateStr),
  );
}

export function formatDateShort(dateStr: string) {
  return new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short" }).format(new Date(dateStr));
}
