import { z } from "zod";
import { optionalDateString } from "./shared";

export const loanSchema = z.object({
  person_name: z.string().min(1, "Name is required").max(120),
  direction: z.enum(["given", "taken"]),
  principal_amount: z.coerce.number().positive("Must be greater than 0"),
  date_of_loan: z.string().min(1, "Date is required"),
  due_date: optionalDateString,
  notes: z.string().max(280).optional(),
  interest_rate: z.coerce.number().min(0).max(100).optional(),
});

export type LoanInput = z.infer<typeof loanSchema>;

export const loanPaymentSchema = z.object({
  loan_id: z.string().uuid(),
  amount: z.coerce.number().positive("Must be greater than 0"),
  paid_on: z.string().min(1, "Date is required"),
  notes: z.string().max(280).optional(),
});

export type LoanPaymentInput = z.infer<typeof loanPaymentSchema>;
