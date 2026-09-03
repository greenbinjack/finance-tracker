import { createClient } from "@/lib/supabase/server";
import type { LoanInput, LoanPaymentInput } from "@/lib/validation/loan";
import { computeLoanStatus, remainingBalance, computeLoanUrgency, type LoanUrgency } from "@/lib/domain/loan";
import { format } from "date-fns";

export async function listLoans() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("loans")
    .select("*, loan_payments(amount, paid_on)")
    .order("date_of_loan", { ascending: false });

  if (error) throw error;
  return data;
}

export interface LoanReminder {
  id: string;
  person_name: string;
  direction: "given" | "taken";
  due_date: string;
  remaining: number;
  urgency: LoanUrgency;
}

/** Open/partly-paid loans that are overdue or due within the next 7 days, soonest first — the data behind the dashboard's loan reminder banner. */
export async function listLoanReminders(): Promise<LoanReminder[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("loans")
    .select("id, person_name, direction, principal_amount, due_date, status, loan_payments(amount)")
    .not("due_date", "is", null)
    .neq("status", "settled")
    .order("due_date", { ascending: true });

  if (error) throw error;

  const today = format(new Date(), "yyyy-MM-dd");

  return data
    .map((loan) => {
      const totalPaid = loan.loan_payments.reduce((sum, p) => sum + Number(p.amount), 0);
      const urgency = computeLoanUrgency(loan.due_date, loan.status, today);
      return {
        id: loan.id,
        person_name: loan.person_name,
        direction: loan.direction,
        due_date: loan.due_date as string,
        remaining: remainingBalance(Number(loan.principal_amount), totalPaid),
        urgency,
      };
    })
    .filter((loan) => loan.urgency !== "none");
}

export async function createLoan(input: LoanInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("loans")
    .insert({ ...input, user_id: user.id, status: "open" })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function addLoanPayment(input: LoanPaymentInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const [
    { data: loan, error: loanError },
    { error: paymentError },
  ] = await Promise.all([
    supabase.from("loans").select("principal_amount, loan_payments(amount)").eq("id", input.loan_id).single(),
    supabase.from("loan_payments").insert({ ...input, user_id: user.id }),
  ]);
  if (loanError) throw loanError;
  if (paymentError) throw paymentError;

  const totalPaid =
    (loan.loan_payments as { amount: number }[]).reduce((sum, p) => sum + Number(p.amount), 0) +
    input.amount;
  const status = computeLoanStatus(Number(loan.principal_amount), totalPaid);

  const { error: statusError } = await supabase
    .from("loans")
    .update({ status })
    .eq("id", input.loan_id);
  if (statusError) throw statusError;

  return { status, totalPaid };
}

export async function getLoan(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("loans")
    .select("*, loan_payments(id, amount, paid_on, notes)")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function deleteLoan(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("loans").delete().eq("id", id);
  if (error) throw error;
}

export interface LoanNetEffect {
  owedToYou: number;
  youOwe: number;
  net: number;
}

/** Net effect of open loans on net worth: money owed to you is an asset, money you owe is a liability. */
export async function getLoanNetEffect(): Promise<LoanNetEffect> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("loans")
    .select("direction, principal_amount, loan_payments(amount)");

  if (error) throw error;

  let owedToYou = 0;
  let youOwe = 0;
  for (const loan of data) {
    const totalPaid = (loan.loan_payments as { amount: number }[]).reduce(
      (sum, p) => sum + Number(p.amount),
      0,
    );
    const remaining = remainingBalance(Number(loan.principal_amount), totalPaid);
    if (loan.direction === "given") owedToYou += remaining;
    else youOwe += remaining;
  }

  return { owedToYou, youOwe, net: owedToYou - youOwe };
}
