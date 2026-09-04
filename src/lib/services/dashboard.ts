import { format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import type { Database, LoanStatus } from "@/lib/supabase/database.types";
import type { TransactionRowData } from "@/components/transaction-row";
import { computeAccountBalances } from "@/lib/domain/accounts";
import { computeInvestmentSummary } from "@/lib/domain/investment";
import { computeIncomeExpenseSummary } from "@/lib/domain/reports";
import { remainingBalance, computeLoanUrgency, type LoanUrgency } from "@/lib/domain/loan";
import type { LoanReminder, LoanNetEffect } from "@/lib/services/loans";

interface DashboardRpcLoan {
  id: string;
  person_name: string;
  direction: "given" | "taken";
  principal_amount: number;
  due_date: string | null;
  status: LoanStatus;
  loan_payments: { amount: number }[];
}

interface DashboardRpcResult {
  profile: Database["public"]["Tables"]["profiles"]["Row"] | null;
  month_transactions: { type: "expense" | "income"; amount: number }[];
  recent_transactions: TransactionRowData[];
  balance_accounts: { id: string; name: string; opening_balance: number }[];
  balance_transactions: {
    account_id: string | null;
    to_account_id: string | null;
    type: "expense" | "income" | "transfer";
    amount: number;
  }[];
  investments: { amount_invested: number; current_value: number }[];
  loans: DashboardRpcLoan[];
  categories: Database["public"]["Tables"]["categories"]["Row"][];
  recent_expenses: {
    category_id: string | null;
    account_id: string | null;
    amount: number;
    occurred_on: string;
    note: string | null;
  }[];
}

/**
 * Everything the dashboard needs, in one round trip via the get_dashboard_data
 * Postgres function, instead of 9 separate concurrent queries. Direct
 * measurement (and a bare Node script reproducing it outside the app
 * entirely) showed that many simultaneous new HTTPS connections to the same
 * Supabase host can occasionally blow past a ~10s connect timeout — the same
 * class of issue get_event_detail was already written to avoid. The actual
 * math (balances, summaries, loan urgency, recurring detection) is untouched,
 * still done by the same pure domain functions — this only changes how the
 * raw rows they need get fetched.
 */
export async function getDashboardData(monthStart: string, monthEnd: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_dashboard_data", {
    p_month_start: monthStart,
    p_month_end: monthEnd,
  });
  if (error) throw error;

  const result = data as unknown as DashboardRpcResult;

  const summary = computeIncomeExpenseSummary(
    result.month_transactions.map((t) => ({ type: t.type, amount: Number(t.amount) })),
  );

  const balances = computeAccountBalances(
    result.balance_accounts.map((a) => ({ id: a.id, name: a.name, openingBalance: Number(a.opening_balance) })),
    result.balance_transactions.map((tx) => ({
      accountId: tx.account_id,
      toAccountId: tx.to_account_id,
      type: tx.type,
      amount: Number(tx.amount),
    })),
  );

  const investmentSummary = computeInvestmentSummary(
    result.investments.map((i) => ({
      amountInvested: Number(i.amount_invested),
      currentValue: Number(i.current_value),
    })),
  );

  let owedToYou = 0;
  let youOwe = 0;
  for (const loan of result.loans) {
    const totalPaid = loan.loan_payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const remaining = remainingBalance(Number(loan.principal_amount), totalPaid);
    if (loan.direction === "given") owedToYou += remaining;
    else youOwe += remaining;
  }
  const loanNet: LoanNetEffect = { owedToYou, youOwe, net: owedToYou - youOwe };

  const today = format(new Date(), "yyyy-MM-dd");
  const loanReminders: LoanReminder[] = result.loans
    .filter((loan) => loan.due_date !== null && loan.status !== "settled")
    .map((loan) => {
      const totalPaid = loan.loan_payments.reduce((sum, p) => sum + Number(p.amount), 0);
      const urgency: LoanUrgency = computeLoanUrgency(loan.due_date, loan.status, today);
      return {
        id: loan.id,
        person_name: loan.person_name,
        direction: loan.direction,
        due_date: loan.due_date as string,
        remaining: remainingBalance(Number(loan.principal_amount), totalPaid),
        urgency,
      };
    })
    .filter((loan) => loan.urgency !== "none")
    .sort((a, b) => a.due_date.localeCompare(b.due_date));

  return {
    profile: result.profile,
    summary,
    transactions: result.recent_transactions,
    balances,
    investmentSummary,
    loanNet,
    loanReminders,
    categories: result.categories,
    recentExpenses: result.recent_expenses,
  };
}
