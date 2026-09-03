import { z } from "zod";

export const investmentSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  type: z.string().min(1, "Type is required").max(60),
  amount_invested: z.coerce.number().positive("Must be greater than 0"),
  current_value: z.coerce.number().nonnegative(),
  date_invested: z.string().min(1, "Date is required"),
  notes: z.string().max(280).optional(),
});

export type InvestmentInput = z.infer<typeof investmentSchema>;
