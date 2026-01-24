import { z } from "zod";

/**
 * Validation schema for generate proposals command
 *
 * Validates request body for POST /api/cards/generate endpoint:
 * - text: Required, non-empty string, max 10,000 characters
 */
export const generateProposalsSchema = z.object({
  text: z.string().min(1, "Text cannot be empty").max(10000, "Text must be 10,000 characters or less"),
});

/**
 * Type inferred from generateProposalsSchema for use in service layer
 */
export type GenerateProposalsValidation = z.infer<typeof generateProposalsSchema>;
