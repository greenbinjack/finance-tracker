import Link from "next/link";
import { listTransactions } from "@/lib/services/transactions";
import { getProfile } from "@/lib/services/profile";
import { listAccounts } from "@/lib/services/accounts";
import { listCategories } from "@/lib/services/categories";
import { TransactionSearchInput } from "@/components/transaction-search-input";
import { TransactionDateRangeFilter } from "@/components/transaction-date-range-filter";
import { TransactionHistoryList } from "@/components/transaction-history-list";
import { cn } from "@/lib/utils";
import type { TransactionKind } from "@/lib/supabase/database.types";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: TransactionKind; q?: string; from?: string; to?: string }>;
}) {
  const { type, q, from, to } = await searchParams;

  const [{ transactions }, profile, accounts, categories] = await Promise.all([
    listTransactions({ type, search: q, from, to, pageSize: 100 }),
    getProfile(),
    listAccounts(),
    listCategories(),
  ]);

  const accountNameById = Object.fromEntries(accounts.map((a) => [a.id, a.name]));

  const carryParams = () => {
    const parts: string[] = [];
    if (q) parts.push(`q=${encodeURIComponent(q)}`);
    if (from) parts.push(`from=${from}`);
    if (to) parts.push(`to=${to}`);
    return parts;
  };

  const filters = [
    { label: "All", value: undefined },
    { label: "Expenses", value: "expense" as const },
    { label: "Income", value: "income" as const },
    { label: "Transfers", value: "transfer" as const },
  ];

  const hasFilters = Boolean(q || from || to);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">History</h1>

      <TransactionSearchInput />
      <TransactionDateRangeFilter />

      <div className="flex gap-2 overflow-x-auto">
        {filters.map((f) => {
          const params = f.value ? [`type=${f.value}`, ...carryParams()] : carryParams();
          const href = params.length ? `/transactions?${params.join("&")}` : "/transactions";
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

      {transactions.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          {hasFilters ? "No transactions match those filters." : "No transactions found."}
        </p>
      ) : (
        <TransactionHistoryList
          transactions={transactions}
          currency={profile?.currency}
          accountNameById={accountNameById}
          categories={categories}
        />
      )}
    </div>
  );
}
