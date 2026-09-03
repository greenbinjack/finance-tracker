import Link from "next/link";
import { formatDate } from "@/lib/format";
import { listTransactions } from "@/lib/services/transactions";
import { getProfile } from "@/lib/services/profile";
import { listAccounts } from "@/lib/services/accounts";
import { TransactionRow } from "@/components/transaction-row";
import { TransactionSearchInput } from "@/components/transaction-search-input";
import { cn } from "@/lib/utils";
import type { TransactionKind } from "@/lib/supabase/database.types";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: TransactionKind; q?: string }>;
}) {
  const { type, q } = await searchParams;

  const [{ transactions }, profile, accounts] = await Promise.all([
    listTransactions({ type, search: q, pageSize: 100 }),
    getProfile(),
    listAccounts(),
  ]);

  const accountNameById = new Map(accounts.map((a) => [a.id, a.name]));

  const groups = transactions.reduce<Record<string, typeof transactions>>((acc, tx) => {
    (acc[tx.occurred_on] ??= []).push(tx);
    return acc;
  }, {});

  const filters = [
    { label: "All", value: undefined },
    { label: "Expenses", value: "expense" as const },
    { label: "Income", value: "income" as const },
    { label: "Transfers", value: "transfer" as const },
  ];

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">History</h1>

      <TransactionSearchInput />

      <div className="flex gap-2 overflow-x-auto">
        {filters.map((f) => {
          const href = f.value
            ? `/transactions?type=${f.value}${q ? `&q=${encodeURIComponent(q)}` : ""}`
            : q
              ? `/transactions?q=${encodeURIComponent(q)}`
              : "/transactions";
          const active = type === f.value;
          return (
            <Link
              key={f.label}
              href={href}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-sm transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      {Object.keys(groups).length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          {q ? `No transactions match "${q}".` : "No transactions found."}
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {Object.entries(groups).map(([date, txs]) => (
            <div key={date}>
              <p className="mb-1 px-2 text-xs font-medium text-muted-foreground">{formatDate(date)}</p>
              <div className="flex flex-col gap-0.5">
                {txs.map((tx) => (
                  <TransactionRow
                    key={tx.id}
                    tx={tx}
                    currency={profile?.currency}
                    accountNameById={accountNameById}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
