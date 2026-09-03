"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createCategory } from "@/lib/services/categories";
import type { TransactionType } from "@/lib/supabase/database.types";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function createCategoryAction(name: string, type: TransactionType) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Category name is required");

  const category = await createCategory(trimmed, type);
  revalidatePath("/transactions");
  return category;
}
