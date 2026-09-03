"use server";

import { revalidatePath } from "next/cache";
import { budgetSchema, type BudgetInput } from "@/lib/validation/budget";
import { setBudget, deleteBudget } from "@/lib/services/budgets";

export async function setBudgetAction(input: BudgetInput) {
  const parsed = budgetSchema.parse(input);
  await setBudget(parsed);
  revalidatePath("/budgets");
}

export async function deleteBudgetAction(id: string) {
  await deleteBudget(id);
  revalidatePath("/budgets");
}
