import { z } from "zod";

export const budgetSchema = z.object({
  category_id: z.string().uuid(),
  month: z.string().min(1, "Month is required"),
  cap_amount: z.coerce.number().positive("Cap must be greater than 0"),
});

export type BudgetInput = z.infer<typeof budgetSchema>;
