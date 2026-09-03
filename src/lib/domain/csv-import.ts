/** RFC 4180-ish CSV parser: handles quoted fields (with embedded commas,
 * quotes, and newlines) and both CRLF and LF line endings. */
export function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  const len = text.length;

  while (i < len) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += char;
      i++;
      continue;
    }
    if (char === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (char === ",") {
      row.push(field);
      field = "";
      i++;
      continue;
    }
    if (char === "\r") {
      i++;
      continue;
    }
    if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i++;
      continue;
    }
    field += char;
    i++;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

export interface CsvImportRow {
  occurred_on: string;
  type: "expense" | "income";
  amount: number;
  category_id: string | null;
  account_id: string | null;
  note: string | null;
}

export interface CsvImportError {
  /** 1-based, counting the header row as line 1 (matches what a spreadsheet app shows). */
  line: number;
  message: string;
}

export interface CsvImportResult {
  rows: CsvImportRow[];
  errors: CsvImportError[];
}

const REQUIRED_HEADERS = ["date", "type", "amount"];
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Parses a transactions CSV in the same shape /api/export/transactions
 * produces (Date, Type, Amount, Category, Account, Note — "To account" and
 * "Event" columns are ignored if present, since transfers and event-tagged
 * imports aren't supported here). Every row is validated independently and
 * collected into either `rows` (ready to insert) or `errors` (report back to
 * the user, nothing written) — never a partial commit of an invalid row.
 */
export function parseTransactionsCsv(
  text: string,
  categories: { id: string; name: string; type: "expense" | "income" }[],
  accounts: { id: string; name: string }[],
): CsvImportResult {
  const rawRows = parseCsvRows(text.trim());
  if (rawRows.length === 0) {
    return { rows: [], errors: [{ line: 1, message: "The file is empty." }] };
  }

  const header = rawRows[0].map((h) => h.trim().toLowerCase());
  const colIndex = (name: string) => header.indexOf(name);
  const missing = REQUIRED_HEADERS.filter((h) => colIndex(h) === -1);
  if (missing.length > 0) {
    return {
      rows: [],
      errors: [
        {
          line: 1,
          message: `Missing required column(s): ${missing.join(", ")}. Expected headers: Date, Type, Amount, and optionally Category, Account, Note.`,
        },
      ],
    };
  }

  const dateIdx = colIndex("date");
  const typeIdx = colIndex("type");
  const amountIdx = colIndex("amount");
  const categoryIdx = colIndex("category");
  const accountIdx = colIndex("account");
  const noteIdx = colIndex("note");

  const categoryByKey = new Map(categories.map((c) => [`${c.type}:${c.name.toLowerCase()}`, c.id]));
  const accountByName = new Map(accounts.map((a) => [a.name.toLowerCase(), a.id]));

  const rows: CsvImportRow[] = [];
  const errors: CsvImportError[] = [];

  for (let i = 1; i < rawRows.length; i++) {
    const line = i + 1;
    const cols = rawRows[i];
    if (cols.every((c) => c.trim() === "")) continue;

    const rawDate = (cols[dateIdx] ?? "").trim();
    const rawType = (cols[typeIdx] ?? "").trim().toLowerCase();
    const rawAmount = (cols[amountIdx] ?? "").trim();
    const rawCategory = categoryIdx >= 0 ? (cols[categoryIdx] ?? "").trim() : "";
    const rawAccount = accountIdx >= 0 ? (cols[accountIdx] ?? "").trim() : "";
    const rawNote = noteIdx >= 0 ? (cols[noteIdx] ?? "").trim() : "";

    if (!rawDate) {
      errors.push({ line, message: "Missing date." });
      continue;
    }
    if (!DATE_PATTERN.test(rawDate)) {
      errors.push({ line, message: `Invalid date "${rawDate}" — expected YYYY-MM-DD.` });
      continue;
    }

    if (rawType !== "expense" && rawType !== "income") {
      errors.push({
        line,
        message:
          rawType === "transfer"
            ? `Transfers aren't supported via import — skip this row or add it manually.`
            : `Invalid type "${rawType}" — expected "expense" or "income".`,
      });
      continue;
    }

    const amount = Number(rawAmount);
    if (!rawAmount || !Number.isFinite(amount) || amount <= 0) {
      errors.push({ line, message: `Invalid amount "${rawAmount}" — must be a positive number.` });
      continue;
    }

    let categoryId: string | null = null;
    if (rawCategory) {
      const found = categoryByKey.get(`${rawType}:${rawCategory.toLowerCase()}`);
      if (!found) {
        errors.push({ line, message: `Unknown ${rawType} category "${rawCategory}".` });
        continue;
      }
      categoryId = found;
    }

    let accountId: string | null = null;
    if (rawAccount) {
      const found = accountByName.get(rawAccount.toLowerCase());
      if (!found) {
        errors.push({ line, message: `Unknown account "${rawAccount}".` });
        continue;
      }
      accountId = found;
    }

    rows.push({
      occurred_on: rawDate,
      type: rawType,
      amount,
      category_id: categoryId,
      account_id: accountId,
      note: rawNote || null,
    });
  }

  return { rows, errors };
}
