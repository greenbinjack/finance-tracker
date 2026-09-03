import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const [
    profile,
    accounts,
    categories,
    transactions,
    transactionSplits,
    investments,
    loans,
    loanPayments,
    events,
    eventParticipants,
    participantSettlements,
    eventScheduledItems,
    eventChecklistItems,
    budgets,
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("accounts").select("*"),
    supabase.from("categories").select("*"),
    supabase.from("transactions").select("*"),
    supabase.from("transaction_splits").select("*"),
    supabase.from("investments").select("*"),
    supabase.from("loans").select("*"),
    supabase.from("loan_payments").select("*"),
    supabase.from("events").select("*"),
    supabase.from("event_participants").select("*"),
    supabase.from("participant_settlements").select("*"),
    supabase.from("event_scheduled_items").select("*"),
    supabase.from("event_checklist_items").select("*"),
    supabase.from("budgets").select("*"),
  ]);

  const payload = {
    exported_at: new Date().toISOString(),
    user: { id: user.id, email: user.email },
    profile: profile.data,
    accounts: accounts.data ?? [],
    categories: categories.data ?? [],
    transactions: transactions.data ?? [],
    // Not every account has run the transaction_splits migration yet — an
    // empty array here just means no custom splits exist, not a real error.
    transaction_splits: transactionSplits.data ?? [],
    investments: investments.data ?? [],
    loans: loans.data ?? [],
    loan_payments: loanPayments.data ?? [],
    events: events.data ?? [],
    event_participants: eventParticipants.data ?? [],
    participant_settlements: participantSettlements.data ?? [],
    event_scheduled_items: eventScheduledItems.data ?? [],
    event_checklist_items: eventChecklistItems.data ?? [],
    budgets: budgets.data ?? [],
  };

  const filename = `finance-tracker-export-${format(new Date(), "yyyy-MM-dd")}.json`;

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
