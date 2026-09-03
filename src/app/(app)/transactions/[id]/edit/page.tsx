import { notFound } from "next/navigation";
import { BackButton } from "@/components/back-button";
import { TransactionForm } from "@/components/transaction-form";
import { ReceiptAttachment } from "@/components/receipt-attachment";
import { listCategories } from "@/lib/services/categories";
import { listAccounts } from "@/lib/services/accounts";
import { listEvents } from "@/lib/services/events";
import { getTransaction } from "@/lib/services/transactions";
import { updateTransactionAction, deleteTransactionAction } from "../../actions";

export default async function EditTransactionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [transaction, categories, accounts, events] = await Promise.all([
    getTransaction(id).catch(() => null),
    listCategories(),
    listAccounts(),
    listEvents(),
  ]);

  if (!transaction) notFound();
  // Transfers touch two accounts and aren't edited here — only from history's
  // delete action (there's no per-field edit surface for the second account).
  if (transaction.type === "transfer") notFound();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <BackButton />
        <h1 className="text-lg font-semibold">Edit transaction</h1>
      </div>

      <TransactionForm
        categories={categories}
        accounts={accounts}
        events={events}
        defaultValues={{
          type: transaction.type,
          amount: transaction.amount,
          category_id: transaction.category_id,
          account_id: transaction.account_id,
          event_id: transaction.event_id,
          occurred_on: transaction.occurred_on,
          note: transaction.note ?? undefined,
        }}
        onSubmit={updateTransactionAction.bind(null, id)}
        onDelete={deleteTransactionAction.bind(null, id, transaction.event_id)}
      />

      {transaction.type === "expense" && (
        <ReceiptAttachment transactionId={id} receiptPath={transaction.receipt_path} />
      )}
    </div>
  );
}
