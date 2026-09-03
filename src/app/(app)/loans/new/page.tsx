import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoanForm } from "@/components/loan-form";
import { createLoanAction } from "../actions";

export default function NewLoanPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          nativeButton={false}
          render={
            <Link href="/loans">
              <ChevronLeft className="h-5 w-5" />
            </Link>
          }
        />
        <h1 className="text-lg font-semibold">Add loan</h1>
      </div>

      <LoanForm onSubmit={createLoanAction} />
    </div>
  );
}
