import { z } from "zod";

export const itineraryItemTypes = ["activity", "flight", "hotel", "transport", "other"] as const;

export const itineraryItemSchema = z.object({
  day_date: z.string().min(1, "Date is required"),
  time: z.string().max(20).optional(),
  title: z.string().min(1, "Title is required").max(200),
  notes: z.string().max(500).optional(),
  location: z.string().max(200).optional(),
  item_type: z.enum(itineraryItemTypes).optional(),
  confirmation_number: z.string().max(80).optional(),
});

export type ItineraryItemInput = z.infer<typeof itineraryItemSchema>;
