import { z } from "zod";

/**
 * An optional date-string field for a form. HTML date inputs left blank submit
 * "" rather than omitting the key — but Postgres `date` columns reject ""
 * ("invalid input syntax for type date"), they need null/undefined. This
 * normalizes "" to undefined so it never reaches the database.
 */
export const optionalDateString = z
  .string()
  .optional()
  .transform((v) => (v === "" ? undefined : v));
