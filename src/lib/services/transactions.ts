import { createClient } from "@/lib/supabase/server";
import type { TransactionInput } from "@/lib/validation/transaction";
import type { TransactionKind } from "@/lib/supabase/database.types";
import {
  buildCategoryBreakdown,
  buildTrend,
  buildBalanceTrend,
  buildDailyExpenseSeries,
  computeIncomeExpenseSummary,
  type Granularity,
} from "@/lib/domain/reports";

export interface TransactionFilters {
  from?: string;
  to?: string;
  categoryId?: string;
  accountId?: string;
  eventId?: string;
  type?: TransactionKind;
  search?: string;
  page?: number;
  pageSize?: number;
}

const DEFAULT_PAGE_SIZE = 30;

export async function listTransactions(filters: TransactionFilters = {}) {
  const supabase = await createClient();
  const page = filters.page ?? 0;
  const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  // accounts is hinted to the account_id FK specifically — there are two FKs
  // from transactions to accounts now (account_id, to_account_id), so the
  // bare, unqualified embed would be ambiguous and PostgREST would reject it.
  let query = supabase
    .from("transactions")
    .select("*, categories(name, icon), accounts!transactions_account_id_fkey(name), events(name)", {
      count: "exact",
    })
    .eq("in_personal_history", true)
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filters.from) query = query.gte("occurred_on", filters.from);
  if (filters.to) query = query.lte("occurred_on", filters.to);
  if (filters.categoryId) query = query.eq("category_id", filters.categoryId);
  if (filters.accountId) query = query.eq("account_id", filters.accountId);
  if (filters.eventId) query = query.eq("event_id", filters.eventId);
  if (filters.type) query = query.eq("type", filters.type);
  if (filters.search) query = query.ilike("note", `%${filters.search}%`);

  const { data, error, count } = await query;
  if (error) throw error;
  return { transactions: data, total: count ?? 0 };
}

/**
 * Recent expense history (last 6 months), narrowed to just the fields
 * detectRecurringTransactions needs — feeds the dashboard's "looks due
 * again" suggestions.
 */
export async function listRecentExpensesForRecurringDetection() {
  const supabase = await createClient();
  const since = new Date();
  since.setMonth(since.getMonth() - 6);

  const { data, error } = await supabase
    .from("transactions")
    .select("category_id, account_id, amount, occurred_on, note")
    .eq("type", "expense")
    .eq("in_personal_history", true)
    .gte("occurred_on", since.toISOString().slice(0, 10));

  if (error) throw error;
  return data;
}

/** Every transaction for the current user, unpaginated — feeds the CSV export. */
export async function listAllTransactionsForExport() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select(
      "occurred_on, type, amount, note, categories(name), accounts!transactions_account_id_fkey(name), to_account:accounts!transactions_to_account_id_fkey(name), events(name)",
    )
    .eq("in_personal_history", true)
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getTransaction(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("transactions").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

export async function createTransaction(input: TransactionInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("transactions")
    .insert({ ...input, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateTransaction(id: string, input: Partial<TransactionInput>) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteTransaction(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) throw error;
}

export async function getDashboardSummary(monthStart: string, monthEnd: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("type, amount")
    .eq("in_personal_history", true)
    // A transfer moves money between the user's own accounts — it's neither
    // income nor expense, so it must never enter this sum (it would
    // otherwise inflate both, since it's still tagged in_personal_history).
    .neq("type", "transfer")
    .gte("occurred_on", monthStart)
    .lte("occurred_on", monthEnd);

  if (error) throw error;

  return computeIncomeExpenseSummary(
    data.map((t) => ({ type: t.type as "expense" | "income", amount: Number(t.amount) })),
  );
}

/** Earliest transaction date on record, for scoping an "all time" report range. */
export async function getEarliestTransactionDate(): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("occurred_on")
    .eq("in_personal_history", true)
    .order("occurred_on", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data?.occurred_on ?? null;
}

export async function getCategoryBreakdown(from: string, to: string, type: "expense" | "income") {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("amount, categories(name)")
    .eq("type", type)
    .eq("in_personal_history", true)
    .gte("occurred_on", from)
    .lte("occurred_on", to);

  if (error) throw error;

  return buildCategoryBreakdown(
    data.map((row) => ({
      categoryName: row.categories?.name ?? null,
      amount: Number(row.amount),
    })),
  );
}

export async function getIncomeExpenseTrend(from: string, to: string, granularity: Granularity) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("occurred_on, type, amount")
    .eq("in_personal_history", true)
    .neq("type", "transfer")
    .gte("occurred_on", from)
    .lte("occurred_on", to);

  if (error) throw error;

  return buildTrend(
    data.map((row) => ({
      occurredOn: row.occurred_on,
      type: row.type as "expense" | "income",
      amount: Number(row.amount),
    })),
    granularity,
  );
}

export async function getBalanceTrend(from: string, to: string, granularity: Granularity) {
  const supabase = await createClient();
  // Needs full history (not just the visible range) so the running balance
  // starts from the real total rather than resetting to 0 — see buildBalanceTrend.
  const { data, error } = await supabase
    .from("transactions")
    .select("occurred_on, type, amount")
    .eq("in_personal_history", true)
    // A transfer between the user's own accounts doesn't change their net
    // worth at all — only expense/income should move this running balance.
    .neq("type", "transfer");

  if (error) throw error;

  return buildBalanceTrend(
    data.map((row) => ({
      occurredOn: row.occurred_on,
      type: row.type as "expense" | "income",
      amount: Number(row.amount),
    })),
    granularity,
    from,
    to,
  );
}

export async function getDailyExpenses(from: string, to: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("occurred_on, type, amount")
    .eq("type", "expense")
    .eq("in_personal_history", true)
    .gte("occurred_on", from)
    .lte("occurred_on", to);

  if (error) throw error;

  return buildDailyExpenseSeries(
    data.map((row) => ({
      occurredOn: row.occurred_on,
      type: row.type as "expense" | "income",
      amount: Number(row.amount),
    })),
    from,
    to,
  );
}
