import { createClient } from "@/lib/supabase/server";
import { listAllTransactionsForExport } from "@/lib/services/transactions";
import { toCsv } from "@/lib/domain/csv";
import { format } from "date-fns";

type ExportRow = Awaited<ReturnType<typeof listAllTransactionsForExport>>[number];

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const transactions = await listAllTransactionsForExport();

  const csv = toCsv<ExportRow>(transactions, [
    { header: "Date", value: (t) => t.occurred_on },
    { header: "Type", value: (t) => t.type },
    { header: "Amount", value: (t) => t.amount },
    { header: "Category", value: (t) => t.categories?.name ?? "" },
    { header: "Account", value: (t) => t.accounts?.name ?? "" },
    { header: "To account", value: (t) => t.to_account?.name ?? "" },
    { header: "Event", value: (t) => t.events?.name ?? "" },
    { header: "Note", value: (t) => t.note ?? "" },
  ]);

  const filename = `transactions-${format(new Date(), "yyyy-MM-dd")}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
