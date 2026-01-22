import type { APIContext } from "astro";

import { getAuthenticatedUser } from "../../../lib/auth.ts";
import {
  createAuthenticationError,
  createNotFoundError,
  createServerError,
  createValidationError,
  handleApiError,
} from "../../../lib/errors/api-errors.ts";
import { CardService } from "../../../lib/services/card.service.ts";
import type { UpdateCardResponse, DeleteCardResponse } from "../../../types.ts";
import { updateCardSchema, cardIdSchema } from "../../../lib/validations/cards.ts";

// Disable prerendering for API routes
export const prerender = false;

/**
 * PATCH /api/cards/:id
 * 
 * Updates an existing flashcard for the authenticated user.
 * 
 * Path Parameters:
 * - id: UUID of the card to update
 * 
 * Request Body:
 * - front: string (optional, 1-200 characters)
 * - back: string (optional, 1-500 characters)
 * 
 * Headers:
 * - Authorization: Bearer <supabase_jwt_token> (required)
 * - Content-Type: application/json (required)
 * 
 * @param context - Astro API context
 * @returns JSON response with updated card data
 */
export async function PATCH(context: APIContext): Promise<Response> {
  try {
    // Step 1: Validate card ID
    const cardId = context.params.id;
    const idValidation = cardIdSchema.safeParse(cardId);

    if (!idValidation.success) {
      return new Response(
        JSON.stringify(createValidationError("Invalid card ID format")),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 2: Authenticate user
    const { user } = await getAuthenticatedUser(context);
    const userId = user.id;

    // Step 3: Parse and validate request body
    let body: unknown;
    try {
      body = await context.request.json();
    } catch (error) {
      return new Response(
        JSON.stringify(createValidationError("Invalid JSON in request body")),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Validate request body using Zod schema
    const validationResult = updateCardSchema.safeParse(body);

    if (!validationResult.success) {
      // Format Zod errors into details object
      const details: Record<string, string> = {};
      validationResult.error.errors.forEach((err) => {
        const path = err.path.join(".");
        details[path] = err.message;
      });

      return new Response(
        JSON.stringify(createValidationError("Validation error", details)),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const command = validationResult.data;

    // Step 4: Call service layer
    const cardService = new CardService(context.locals.supabase);
    const card = await cardService.updateCard(idValidation.data, command, userId);

    // Step 5: Construct response
    const response: UpdateCardResponse = card;

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Handle authentication errors
    if (error instanceof Error && error.name === "AuthenticationError") {
      return new Response(
        JSON.stringify(createAuthenticationError(error.message)),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Handle not found errors
    if (error instanceof Error && error.name === "NotFoundError") {
      return new Response(
        JSON.stringify(createNotFoundError("Card not found or not owned by user")),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Handle all other errors
    const errorResponse = handleApiError(error, {
      endpoint: "PATCH /api/cards/:id",
      userId: context.locals.supabase ? "unknown" : undefined,
    });

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/**
 * DELETE /api/cards/:id
 * 
 * Soft-deletes a flashcard for the authenticated user.
 * 
 * Path Parameters:
 * - id: UUID of the card to delete
 * 
 * Headers:
 * - Authorization: Bearer <supabase_jwt_token> (required)
 * 
 * @param context - Astro API context
 * @returns JSON response confirming deletion
 */
export async function DELETE(context: APIContext): Promise<Response> {
  try {
    // Step 1: Validate card ID
    const cardId = context.params.id;
    const idValidation = cardIdSchema.safeParse(cardId);

    if (!idValidation.success) {
      return new Response(
        JSON.stringify(createValidationError("Invalid card ID format")),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 2: Authenticate user
    const { user } = await getAuthenticatedUser(context);
    const userId = user.id;

    // Step 3: Call service layer
    const cardService = new CardService(context.locals.supabase);
    await cardService.deleteCard(idValidation.data, userId);

    // Step 4: Construct response
    const response: DeleteCardResponse = {
      message: "Card deleted successfully",
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Handle authentication errors
    if (error instanceof Error && error.name === "AuthenticationError") {
      return new Response(
        JSON.stringify(createAuthenticationError(error.message)),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Handle not found errors
    if (error instanceof Error && error.name === "NotFoundError") {
      return new Response(
        JSON.stringify(createNotFoundError("Card not found or not owned by user")),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Handle all other errors
    const errorResponse = handleApiError(error, {
      endpoint: "DELETE /api/cards/:id",
      userId: context.locals.supabase ? "unknown" : undefined,
    });

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
