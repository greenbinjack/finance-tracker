import { z } from "zod";
import { optionalDateString } from "./shared";

export const eventSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(120),
    budget_amount: z.coerce.number().nonnegative().optional(),
    start_date: optionalDateString,
    end_date: optionalDateString,
    notes: z.string().max(280).optional(),
  })
  .refine(
    (data) => !data.start_date || !data.end_date || data.start_date <= data.end_date,
    { message: "End date must be after start date", path: ["end_date"] },
  );

export type EventInput = z.infer<typeof eventSchema>;
