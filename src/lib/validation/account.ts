import { z } from "zod";

export const accountTypes = ["cash", "bank", "card", "mobile_wallet", "brokerage", "other"] as const;
export type AccountTypeValue = (typeof accountTypes)[number];

export const accountSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  account_type: z.enum(accountTypes),
  institution_name: z.string().max(160).optional(),
  account_number: z.string().max(64).optional(),
  card_number: z.string().max(32).optional(),
  branch_name: z.string().max(160).optional(),
  branch_address: z.string().max(280).optional(),
  /** What the account already held before you started logging transactions
   * here — e.g. existing bank balance, or a brokerage account's ledger
   * balance. Defaults to 0 (a fresh account). */
  opening_balance: z.coerce.number().default(0),
});

export type AccountInput = z.infer<typeof accountSchema>;

export const transferSchema = z
  .object({
    from_account_id: z.string().uuid(),
    to_account_id: z.string().uuid(),
    amount: z.coerce.number().positive("Amount must be greater than 0"),
    occurred_on: z.string().min(1, "Date is required"),
    note: z.string().max(280).optional(),
    password: z.string().min(1, "Enter your password to confirm"),
  })
  .refine((data) => data.from_account_id !== data.to_account_id, {
    message: "Pick two different accounts",
    path: ["to_account_id"],
  });

export type TransferInput = z.infer<typeof transferSchema>;
