import { createClient } from "@/lib/supabase/server";
import type { TransactionType } from "@/lib/supabase/database.types";

export async function listCategories(type?: TransactionType) {
  const supabase = await createClient();
  let query = supabase.from("categories").select("*").order("name");
  if (type) query = query.eq("type", type);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function createCategory(name: string, type: TransactionType, icon?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("categories")
    .insert({ name, type, icon: icon ?? null, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function renameCategory(id: string, name: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .update({ name })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteCategory(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw error;
}
