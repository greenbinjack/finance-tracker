"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { loanSchema, loanPaymentSchema, type LoanInput, type LoanPaymentInput } from "@/lib/validation/loan";
import { createLoan, addLoanPayment, deleteLoan } from "@/lib/services/loans";

export async function createLoanAction(input: LoanInput) {
  const parsed = loanSchema.parse(input);
  await createLoan(parsed);
  revalidatePath("/loans");
  revalidatePath("/");
  redirect("/loans");
}

export async function addLoanPaymentAction(loanId: string, input: Omit<LoanPaymentInput, "loan_id">) {
  const parsed = loanPaymentSchema.parse({ ...input, loan_id: loanId });
  await addLoanPayment(parsed);
  revalidatePath(`/loans/${loanId}`);
  revalidatePath("/loans");
  revalidatePath("/");
}

export async function deleteLoanAction(id: string) {
  await deleteLoan(id);
  revalidatePath("/loans");
  revalidatePath("/");
  redirect("/loans");
}
