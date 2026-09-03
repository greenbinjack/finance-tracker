import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TransactionForm } from "@/components/transaction-form";
import { listCategories } from "@/lib/services/categories";
import { listAccounts } from "@/lib/services/accounts";
import { listEvents } from "@/lib/services/events";
import { createTransactionAction } from "../actions";

export default async function NewTransactionPage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string; category?: string; account?: string; amount?: string; note?: string }>;
}) {
  const [{ event: eventId, category, account, amount, note }, categories, accounts, events] = await Promise.all([
    searchParams,
    listCategories(),
    listAccounts(),
    listEvents(),
  ]);

  const backHref = eventId ? `/events/${eventId}` : "/";
  const lockedEvent = eventId ? events.find((e) => e.id === eventId) : undefined;

  // Prefill from a "looks recurring, log it again?" dashboard suggestion —
  // still just a starting point in the form, nothing is saved until the
  // user submits it themselves.
  const prefill =
    category || account || amount || note
      ? {
          type: "expense" as const,
          category_id: category,
          account_id: account,
          amount: amount ? Number(amount) : undefined,
          note,
        }
      : undefined;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          nativeButton={false}
          render={
            <Link href={backHref}>
              <ChevronLeft className="h-5 w-5" />
            </Link>
          }
        />
        <h1 className="text-lg font-semibold">Add transaction</h1>
      </div>

      <TransactionForm
        categories={categories}
        accounts={accounts}
        events={events}
        defaultValues={prefill ?? (lockedEvent ? { type: "expense" } : undefined)}
        lockedEvent={lockedEvent}
        onSubmit={createTransactionAction}
      />
    </div>
  );
}
