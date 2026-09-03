import { z } from "zod";

export const transactionSchema = z.object({
  type: z.enum(["expense", "income"]),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  category_id: z.string().uuid().nullable().optional(),
  account_id: z.string().uuid().nullable().optional(),
  event_id: z.string().uuid().nullable().optional(),
  occurred_on: z.string().min(1, "Date is required"),
  note: z.string().max(280).optional(),
});

export type TransactionInput = z.infer<typeof transactionSchema>;
