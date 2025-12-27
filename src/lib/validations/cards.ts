import { z } from "zod";

/**
 * Validation schema for list cards query parameters
 * 
 * Validates and coerces query parameters for GET /api/cards endpoint:
 * - page: integer >= 1, default: 1
 * - limit: integer between 1 and 100, default: 50
 * - include_deleted: boolean, default: false
 */
export const listCardsQuerySchema = z.object({
  page: z.coerce.number().int().min(1, "Page must be a positive integer").default(1),
  limit: z.coerce.number().int().min(1, "Limit must be at least 1").max(100, "Limit must be at most 100").default(50),
  include_deleted: z.coerce.boolean().default(false),
});

/**
 * Type inferred from listCardsQuerySchema for use in service layer
 */
export type ListCardsQueryParams = z.infer<typeof listCardsQuerySchema>;

/**
 * Validation schema for create card request body
 * 
 * Validates request body for POST /api/cards endpoint:
 * - front: Required, non-empty string, max 200 characters
 * - back: Required, non-empty string, max 500 characters
 */
export const createCardSchema = z.object({
  front: z.string().min(1, "Front cannot be empty").max(200, "Front must be 200 characters or less"),
  back: z.string().min(1, "Back cannot be empty").max(500, "Back must be 500 characters or less"),
});

/**
 * Type inferred from createCardSchema for use in service layer
 */
export type CreateCardValidation = z.infer<typeof createCardSchema>;

