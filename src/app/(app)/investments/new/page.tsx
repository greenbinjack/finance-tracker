import { BackButton } from "@/components/back-button";
import { InvestmentForm } from "@/components/investment-form";
import { listInvestmentTypes } from "@/lib/services/investments";
import { createInvestmentAction } from "../actions";

export default async function NewInvestmentPage() {
  const types = await listInvestmentTypes();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <BackButton />
        <h1 className="text-lg font-semibold">Add investment</h1>
      </div>

      <InvestmentForm types={types} onSubmit={createInvestmentAction} />
    </div>
  );
}
