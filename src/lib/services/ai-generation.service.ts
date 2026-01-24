import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../../db/database.types.ts";
import type { CardProposal } from "../../types.ts";
import {
  createOpenRouterService,
  InvalidJsonError,
  PaymentRequiredError,
  RateLimitError,
  ServerError,
  NetworkError,
} from "./openrouter.service.ts";
import { FLASHCARD_SYSTEM_PROMPT, createFlashcardUserPrompt } from "../prompts/flashcard-generation.ts";
import { AnalyticsService } from "./analytics.service.ts";

/**
 * Interface for flashcard response from AI
 */
interface FlashcardResponse {
  flashcards: CardProposal[];
}

/**
 * Service for AI-powered flashcard generation using OpenRouter
 */
export class AIGenerationService {
  private openRouter: ReturnType<typeof createOpenRouterService>;

  constructor(private supabase: SupabaseClient<Database>) {
    // Initialize OpenRouter service in constructor to catch initialization errors
    try {
      this.openRouter = createOpenRouterService({
        defaultModel: "openai/gpt-4o-mini",
        defaultTemperature: 0.7,
        defaultMaxTokens: 2000,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to initialize OpenRouter service: ${errorMessage}`);
    }
  }

  /**
   * Generates flashcard proposals from text using AI
   *
   * Handles retries for invalid JSON (up to 2 retries), validates response schema,
   * filters invalid proposals (exceeding character limits), and creates analytics event.
   *
   * @param text - Source text to generate flashcards from (validated, max 10,000 chars)
   * @param userId - Authenticated user's ID
   * @returns Promise resolving to proposals array and count
   * @throws Error for various failure scenarios (quota, invalid JSON, network, etc.)
   */
  async generateProposals(text: string, userId: string): Promise<{ proposals: CardProposal[]; count: number }> {
    const maxRetries = 2;
    let lastError: Error | null = null;

    // Retry logic for invalid JSON responses
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Call OpenRouter API with structured output
        const response = await this.openRouter.chat({
          messages: [
            {
              role: "system",
              content: FLASHCARD_SYSTEM_PROMPT,
            },
            {
              role: "user",
              content: createFlashcardUserPrompt(text),
            },
          ],
          responseFormat: {
            type: "json_schema",
            json_schema: {
              name: "FlashcardProposals",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  flashcards: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        front: { type: "string" },
                        back: { type: "string" },
                      },
                      required: ["front", "back"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["flashcards"],
                additionalProperties: false,
              },
            },
          },
        });

        // Parse and validate response
        let parsed: FlashcardResponse;
        try {
          parsed = JSON.parse(response.content) as FlashcardResponse;
        } catch (parseError) {
          // If JSON parsing fails, treat as invalid JSON and retry
          if (attempt < maxRetries) {
            lastError = new InvalidJsonError(
              `Failed to parse AI response as JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`
            );
            continue;
          }
          throw new InvalidJsonError("AI returned invalid JSON after retries");
        }

        // Validate structure
        if (!parsed.flashcards || !Array.isArray(parsed.flashcards)) {
          if (attempt < maxRetries) {
            lastError = new InvalidJsonError("AI response missing flashcards array");
            continue;
          }
          throw new InvalidJsonError("AI response missing flashcards array after retries");
        }

        // Filter invalid proposals (exceeding character limits)
        const validProposals = parsed.flashcards.filter((proposal) => {
          const frontValid = proposal.front && typeof proposal.front === "string" && proposal.front.length <= 200;
          const backValid = proposal.back && typeof proposal.back === "string" && proposal.back.length <= 500;
          return frontValid && backValid;
        });

        // If no valid proposals after filtering, retry if attempts remain
        if (validProposals.length === 0 && attempt < maxRetries) {
          lastError = new InvalidJsonError("All proposals exceeded character limits");
          continue;
        }

        // Limit to 5 proposals
        const proposals = validProposals.slice(0, 5);

        // Create analytics event (non-blocking)
        const analyticsService = new AnalyticsService(this.supabase);
        await analyticsService.trackEvent(userId, "generate", null, {});

        return {
          proposals,
          count: proposals.length,
        };
      } catch (error) {
        // Handle OpenRouter-specific errors
        if (error instanceof PaymentRequiredError) {
          throw new Error("QUOTA_EXCEEDED: OpenRouter quota exceeded");
        }
        if (error instanceof RateLimitError) {
          throw new Error("QUOTA_EXCEEDED: Rate limit exceeded");
        }
        if (error instanceof ServerError || error instanceof NetworkError) {
          throw new Error(`SERVER_ERROR: ${error.message}`);
        }
        if (error instanceof InvalidJsonError) {
          // Retry on invalid JSON if attempts remain
          if (attempt < maxRetries) {
            lastError = error;
            continue;
          }
          throw new Error(`INVALID_JSON: ${error.message}`);
        }

        // For other errors, throw immediately
        throw error;
      }
    }

    // If we exhausted retries, throw last error
    if (lastError) {
      throw new Error(`INVALID_JSON: ${lastError.message}`);
    }

    // This should never be reached
    throw new Error("Failed to generate proposals after retries");
  }
}
