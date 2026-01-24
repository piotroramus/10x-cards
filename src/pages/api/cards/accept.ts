import type { APIContext } from "astro";

import { getAuthenticatedUser } from "../../../lib/auth.ts";
import { createAuthenticationError, createValidationError, handleApiError } from "../../../lib/errors/api-errors.ts";
import { CardService } from "../../../lib/services/card.service.ts";
import type { AcceptProposalResponse } from "../../../types.ts";
import { createCardSchema } from "../../../lib/validations/cards.ts";

// Disable prerendering for API routes
export const prerender = false;

/**
 * POST /api/cards/accept
 *
 * Accepts an AI-generated proposal and persists it as a card.
 * Sets origin='ai' automatically and creates an analytics event 'accept'.
 *
 * Request Body:
 * - front: string (required, 1-200 characters)
 * - back: string (required, 1-500 characters)
 *
 * Headers:
 * - Authorization: Bearer <supabase_jwt_token> (required)
 * - Content-Type: application/json (required)
 *
 * @param context - Astro API context
 * @returns JSON response with created card data
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

    // Validate request body using same Zod schema as Create Card
    const validationResult = createCardSchema.safeParse(body);

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

    const command = validationResult.data;

    // Step 3: Call service layer
    const cardService = new CardService(context.locals.supabase);
    const card = await cardService.acceptProposal(command, userId);

    // Step 4: Construct response
    const response: AcceptProposalResponse = card;

    return new Response(JSON.stringify(response), {
      status: 201,
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
      endpoint: "POST /api/cards/accept",
      userId: context.locals.supabase ? "unknown" : undefined,
    });

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
