import { z } from "zod";

export const participantSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
});

export type ParticipantInput = z.infer<typeof participantSchema>;

export const settlementSchema = z
  .object({
    from_participant_id: z.string().uuid().nullable(),
    to_participant_id: z.string().uuid().nullable(),
    amount: z.coerce.number().positive("Must be greater than 0"),
    settled_on: z.string().min(1, "Date is required"),
    notes: z.string().max(280).optional(),
  })
  .refine((data) => data.from_participant_id !== data.to_participant_id, {
    message: "Pick two different people",
    path: ["to_participant_id"],
  });

export type SettlementInput = z.infer<typeof settlementSchema>;

/** One person's share of a custom-split expense — null participant_id means "Myself". */
export const splitShareSchema = z.object({
  participant_id: z.string().uuid().nullable(),
  amount: z.coerce.number().positive("Must be greater than 0"),
});

export type SplitShareInput = z.infer<typeof splitShareSchema>;

export const eventExpenseSchema = z
  .object({
    type: z.enum(["expense", "income"]),
    amount: z.coerce.number().positive("Amount must be greater than 0"),
    category_id: z.string().uuid().nullable().optional(),
    account_id: z.string().uuid().nullable().optional(),
    occurred_on: z.string().min(1, "Date is required"),
    note: z.string().max(280).optional(),
    /** Who gave this money — null means the app's user ("Myself"), which also auto-creates a personal-history record for it. */
    paid_by_participant_id: z.string().uuid().nullable(),
    /** Set when this entry fulfills (fully or partially) a planned scheduled item. */
    scheduled_item_id: z.string().uuid().nullable().optional(),
    /** Money from outside the group (e.g. a parent funding part of the trip) — still real spend/income, but excluded from the split. */
    is_external: z.boolean().optional(),
    /** Custom cost split for this expense — omitted/empty means the default equal split among all participants. Must sum to `amount`. */
    splits: z.array(splitShareSchema).optional(),
  })
  .refine((data) => !data.is_external || data.paid_by_participant_id === null, {
    message: "External money can't also be attributed to a participant",
    path: ["paid_by_participant_id"],
  })
  .refine(
    (data) => {
      if (!data.splits || data.splits.length === 0) return true;
      const sum = data.splits.reduce((s, x) => s + x.amount, 0);
      return Math.abs(sum - data.amount) < 0.01;
    },
    { message: "Split amounts must add up to the total", path: ["splits"] },
  );

export type EventExpenseInput = z.infer<typeof eventExpenseSchema>;

/** A planned expense/income for a trip — money known to be needed or expected, before anyone's actually paid it. */
export const scheduledItemSchema = z.object({
  type: z.enum(["expense", "income"]),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  note: z.string().max(280).optional(),
});

export type ScheduledItemInput = z.infer<typeof scheduledItemSchema>;
