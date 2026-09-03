import { createClient } from "@/lib/supabase/server";
import type { InvestmentInput } from "@/lib/validation/investment";
import { computeInvestmentSummary, mergeInvestmentTypes } from "@/lib/domain/investment";

export async function listInvestments() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("investments")
    .select("*")
    .order("date_invested", { ascending: false });

  if (error) throw error;
  return data;
}

export async function listInvestmentTypes() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("investments").select("type");
  if (error) throw error;
  return mergeInvestmentTypes(data.map((i) => i.type));
}

export async function getInvestment(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("investments").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

export async function getInvestmentSummary() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("investments").select("amount_invested, current_value");
  if (error) throw error;

  return computeInvestmentSummary(
    data.map((i) => ({
      amountInvested: Number(i.amount_invested),
      currentValue: Number(i.current_value),
    })),
  );
}

export async function createInvestment(input: InvestmentInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("investments")
    .insert({ ...input, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateInvestment(id: string, input: Partial<InvestmentInput>) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("investments")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteInvestment(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("investments").delete().eq("id", id);
  if (error) throw error;
}
