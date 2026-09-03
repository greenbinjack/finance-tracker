import { notFound } from "next/navigation";
import { BackButton } from "@/components/back-button";
import { InvestmentForm } from "@/components/investment-form";
import { getInvestment, listInvestmentTypes } from "@/lib/services/investments";
import { updateInvestmentAction, deleteInvestmentAction } from "../../actions";

export default async function EditInvestmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [investment, types] = await Promise.all([
    getInvestment(id).catch(() => null),
    listInvestmentTypes(),
  ]);

  if (!investment) notFound();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <BackButton />
        <h1 className="text-lg font-semibold">Edit investment</h1>
      </div>

      <InvestmentForm
        types={types}
        defaultValues={{
          name: investment.name,
          type: investment.type,
          amount_invested: investment.amount_invested,
          current_value: investment.current_value,
          date_invested: investment.date_invested,
          notes: investment.notes ?? undefined,
        }}
        onSubmit={updateInvestmentAction.bind(null, id)}
        onDelete={deleteInvestmentAction.bind(null, id)}
      />
    </div>
  );
}
