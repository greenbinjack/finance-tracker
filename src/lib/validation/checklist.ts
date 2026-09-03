import { z } from "zod";

export const checklistItemSchema = z.object({
  text: z.string().min(1, "Item is required").max(200),
});

export type ChecklistItemInput = z.infer<typeof checklistItemSchema>;
