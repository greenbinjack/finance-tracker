"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { investmentSchema, type InvestmentInput } from "@/lib/validation/investment";
import {
  createInvestment,
  updateInvestment,
  deleteInvestment,
} from "@/lib/services/investments";

export async function createInvestmentAction(input: InvestmentInput) {
  const parsed = investmentSchema.parse(input);
  await createInvestment(parsed);
  revalidatePath("/investments");
  revalidatePath("/");
  redirect("/investments");
}

export async function updateInvestmentAction(id: string, input: InvestmentInput) {
  const parsed = investmentSchema.parse(input);
  await updateInvestment(id, parsed);
  revalidatePath("/investments");
  revalidatePath("/");
  redirect("/investments");
}

export async function deleteInvestmentAction(id: string) {
  await deleteInvestment(id);
  revalidatePath("/investments");
  revalidatePath("/");
  redirect("/investments");
}
