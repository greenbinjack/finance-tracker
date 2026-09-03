import { endOfMonth, format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import type { BudgetInput } from "@/lib/validation/budget";

export interface CategoryBudgetProgress {
  categoryId: string;
  categoryName: string;
  icon: string | null;
  budgetId: string | null;
  cap: number | null;
  spent: number;
}

/**
 * Every expense category with its cap for the given month (if one was set)
 * and actual spend for that month — the data behind the budgets page. Month
 * is the first day of the month, e.g. "2026-09-01".
 */
export async function listBudgetsForMonth(month: string): Promise<CategoryBudgetProgress[]> {
  const supabase = await createClient();
  // Local-time throughout, start to finish — mixing a locally-parsed Date
  // with UTC getters (as this used to) reads back a day (or, near a month
  // boundary, a whole month) early for anyone east of UTC, e.g. Bangladesh
  // at UTC+6, which silently made every month's spend total come back ৳0:
  // the resulting range's end landed before its start.
  const monthDate = new Date(month + "T00:00:00");
  const monthEnd = format(endOfMonth(monthDate), "yyyy-MM-dd");

  const [
    { data: categories, error: categoriesError },
    { data: budgets, error: budgetsError },
    { data: transactions, error: transactionsError },
  ] = await Promise.all([
    supabase.from("categories").select("id, name, icon").eq("type", "expense").order("name"),
    supabase.from("budgets").select("id, category_id, cap_amount").eq("month", month),
    supabase
      .from("transactions")
      .select("category_id, amount")
      .eq("type", "expense")
      .eq("in_personal_history", true)
      .gte("occurred_on", month)
      .lte("occurred_on", monthEnd),
  ]);
  if (categoriesError) throw categoriesError;
  if (budgetsError) throw budgetsError;
  if (transactionsError) throw transactionsError;

  const budgetByCategory = new Map(budgets.map((b) => [b.category_id, b]));
  const spentByCategory = new Map<string, number>();
  for (const tx of transactions) {
    if (!tx.category_id) continue;
    spentByCategory.set(tx.category_id, (spentByCategory.get(tx.category_id) ?? 0) + Number(tx.amount));
  }

  return categories.map((c) => {
    const budget = budgetByCategory.get(c.id);
    return {
      categoryId: c.id,
      categoryName: c.name,
      icon: c.icon,
      budgetId: budget?.id ?? null,
      cap: budget ? Number(budget.cap_amount) : null,
      spent: spentByCategory.get(c.id) ?? 0,
    };
  });
}

export async function setBudget(input: BudgetInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("budgets")
    .upsert(
      { ...input, user_id: user.id },
      { onConflict: "user_id,category_id,month" },
    );
  if (error) throw error;
}

export async function deleteBudget(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("budgets").delete().eq("id", id);
  if (error) throw error;
}
