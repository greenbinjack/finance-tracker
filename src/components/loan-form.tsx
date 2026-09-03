"use client";

import { useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { toast } from "sonner";
import type { z } from "zod";
import { loanSchema, type LoanInput } from "@/lib/validation/loan";
import { isRedirectError } from "@/lib/is-redirect-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type LoanFormValues = z.input<typeof loanSchema>;

export function LoanForm({ onSubmit }: { onSubmit: (input: LoanInput) => Promise<void> }) {
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<LoanFormValues, unknown, LoanInput>({
    resolver: zodResolver(loanSchema),
    defaultValues: {
      direction: "given",
      date_of_loan: new Date().toISOString().slice(0, 10),
    },
  });

  const submit = handleSubmit((data) => {
    startTransition(async () => {
      try {
        await onSubmit(data);
      } catch (error) {
        if (isRedirectError(error)) throw error;
        toast.error("Something went wrong. Please try again.");
      }
    });
  });

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <Controller
        control={control}
        name="direction"
        render={({ field }) => (
          <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
            {(
              [
                { value: "given", label: "I lent it" },
                { value: "taken", label: "I borrowed it" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => field.onChange(opt.value)}
                className={cn(
                  "relative rounded-md py-2 text-sm font-medium transition-colors",
                  field.value === opt.value ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {field.value === opt.value && (
                  <motion.span
                    layoutId="loan-direction-pill"
                    className="absolute inset-0 rounded-md bg-background shadow-sm"
                    transition={{ duration: 0.2 }}
                  />
                )}
                <span className="relative">{opt.label}</span>
              </button>
            ))}
          </div>
        )}
      />

      <div className="flex flex-col gap-2">
        <Label htmlFor="person_name">Person</Label>
        <Input id="person_name" placeholder="e.g. Rafi" {...register("person_name")} />
        {errors.person_name && <p className="text-xs text-destructive">{errors.person_name.message}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="principal_amount">Amount</Label>
        <Input
          id="principal_amount"
          type="number"
          inputMode="decimal"
          step="0.01"
          placeholder="0.00"
          className="text-lg"
          {...register("principal_amount")}
        />
        {errors.principal_amount && (
          <p className="text-xs text-destructive">{errors.principal_amount.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="date_of_loan">Date</Label>
          <Input id="date_of_loan" type="date" {...register("date_of_loan")} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="due_date">Due date (optional)</Label>
          <Input id="due_date" type="date" {...register("due_date")} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Input id="notes" placeholder="e.g. For rent" {...register("notes")} />
      </div>

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Saving..." : "Add loan"}
      </Button>
    </form>
  );
}
