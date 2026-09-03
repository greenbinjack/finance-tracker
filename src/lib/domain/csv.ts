export interface CsvColumn<T> {
  header: string;
  value: (row: T) => string | number | null | undefined;
}

/** Quotes a field only when it contains a comma, quote, or newline — RFC 4180. */
function escapeCsvField(value: string | number | null | undefined): string {
  let str = value === null || value === undefined ? "" : String(value);
  // CSV/formula injection: a cell starting with =, +, -, or @ is interpreted
  // as a formula by Excel/Sheets when the file is opened. Only guard actual
  // string fields (free-text like notes) — a negative number is a normal
  // amount, not an injection risk, and must stay a real number in the file.
  if (typeof value === "string" && /^[=+\-@]/.test(str)) {
    str = `'${str}`;
  }
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map((c) => escapeCsvField(c.header)).join(",");
  const lines = rows.map((row) => columns.map((c) => escapeCsvField(c.value(row))).join(","));
  return [header, ...lines].join("\r\n");
}
