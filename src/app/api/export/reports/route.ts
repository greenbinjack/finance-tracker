import { NextRequest } from "next/server";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { listFilteredTransactionsForExport } from "@/lib/services/transactions";
import { toCsv } from "@/lib/domain/csv";

type ExportRow = Awaited<ReturnType<typeof listFilteredTransactionsForExport>>[number];

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if (!from || !to) {
    return new Response("Missing from/to", { status: 400 });
  }
  const accountId = searchParams.get("accountId") ?? undefined;
  const eventId = searchParams.get("eventId") ?? undefined;

  const transactions = await listFilteredTransactionsForExport(from, to, { accountId, eventId });

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

  const filename = `report-${from}-to-${to}-${format(new Date(), "yyyy-MM-dd")}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
