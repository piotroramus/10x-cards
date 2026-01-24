import type { APIContext } from "astro";

import { getAuthenticatedUser } from "../../../lib/auth.ts";
import {
  createAuthenticationError,
  createQuotaExceededError,
  createServerError,
  createValidationError,
  handleApiError,
} from "../../../lib/errors/api-errors.ts";
import { AIGenerationService } from "../../../lib/services/ai-generation.service.ts";
import type { GenerateProposalsResponse } from "../../../types.ts";
import { generateProposalsSchema } from "../../../lib/validations/ai-generation.ts";

// Disable prerendering for API routes
export const prerender = false;

/**
 * POST /api/cards/generate
 *
 * Generates AI flashcard proposals from pasted English text using OpenRouter.
 * Validates input length, calls the AI model, validates output schema and character limits,
 * and creates an analytics event `generate`. The proposals are not persisted;
 * they must be accepted via `/api/cards/accept` endpoint.
 *
 * Request Body:
 * - text: string (required, 1-10,000 characters)
 *
 * Headers:
 * - Authorization: Bearer <supabase_jwt_token> (required)
 * - Content-Type: application/json (required)
 *
 * @param context - Astro API context
 * @returns JSON response with proposals array and count
 */
export async function POST(context: APIContext): Promise<Response> {
  try {
    // Step 1: Authenticate user
    const { user } = await getAuthenticatedUser(context);
    const userId = user.id;

    // Step 2: Parse and validate request body
    let body: unknown;
    try {
      body = await context.request.json();
    } catch {
      return new Response(JSON.stringify(createValidationError("Invalid JSON in request body")), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Validate request body using Zod schema
    const validationResult = generateProposalsSchema.safeParse(body);

    if (!validationResult.success) {
      // Format Zod errors into details object
      const details: Record<string, string> = {};
      validationResult.error.errors.forEach((err) => {
        const path = err.path.join(".");
        details[path] = err.message;
      });

      return new Response(JSON.stringify(createValidationError("Validation error", details)), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { text } = validationResult.data;

    // Step 3: Call service layer
    let aiService: AIGenerationService;
    try {
      aiService = new AIGenerationService(context.locals.supabase);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("OPENROUTER_API_KEY")) {
        return new Response(JSON.stringify(createServerError("OpenRouter API key is not configured")), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
      throw error; // Re-throw if it's a different error
    }

    let result: GenerateProposalsResponse;

    try {
      result = await aiService.generateProposals(text, userId);
    } catch (error) {
      // Handle service-specific errors
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Quota exceeded (402 Payment Required)
      if (errorMessage.includes("QUOTA_EXCEEDED")) {
        return new Response(JSON.stringify(createQuotaExceededError("OpenRouter quota or rate limit exceeded")), {
          status: 402,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Rate limit (429 Too Many Requests)
      if (errorMessage.includes("Rate limit")) {
        return new Response(JSON.stringify(createQuotaExceededError("Rate limit exceeded. Please try again later")), {
          status: 429,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Invalid JSON (422 Unprocessable Entity)
      if (errorMessage.includes("INVALID_JSON")) {
        return new Response(
          JSON.stringify(createValidationError("AI model returned invalid proposals. Please try again.")),
          {
            status: 422,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Server/Network errors (500/503)
      if (errorMessage.includes("SERVER_ERROR") || errorMessage.includes("Network")) {
        const status = errorMessage.includes("unavailable") ? 503 : 500;
        return new Response(
          JSON.stringify(
            createServerError(
              status === 503 ? "AI service temporarily unavailable" : "An internal server error occurred"
            )
          ),
          {
            status,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Re-throw unknown errors to be handled by general error handler
      throw error;
    }

    // Step 4: Construct response
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Handle authentication errors
    if (error instanceof Error && error.name === "AuthenticationError") {
      return new Response(JSON.stringify(createAuthenticationError(error.message)), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Handle all other errors
    const errorResponse = handleApiError(error, {
      endpoint: "POST /api/cards/generate",
      userId: context.locals.supabase ? "unknown" : undefined,
    });

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
