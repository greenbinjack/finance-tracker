import { BackButton } from "@/components/back-button";
import { LoanForm } from "@/components/loan-form";
import { createLoanAction } from "../actions";

export default function NewLoanPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <BackButton />
        <h1 className="text-lg font-semibold">Add loan</h1>
      </div>

      <LoanForm onSubmit={createLoanAction} />
    </div>
  );
}
