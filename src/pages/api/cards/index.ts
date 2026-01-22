import type { APIContext } from "astro";

import { getAuthenticatedUser } from "../../../lib/auth.ts";
import {
  createAuthenticationError,
  createServerError,
  createValidationError,
  handleApiError,
} from "../../../lib/errors/api-errors.ts";
import { CardService } from "../../../lib/services/card.service.ts";
import type { CreateCardResponse, ListCardsResponse } from "../../../types.ts";
import { createCardSchema, listCardsQuerySchema } from "../../../lib/validations/cards.ts";

// Disable prerendering for API routes
export const prerender = false;

/**
 * GET /api/cards
 * 
 * Lists all active (non-deleted) cards for the authenticated user with pagination.
 * 
 * Query Parameters:
 * - page: integer >= 1 (default: 1)
 * - limit: integer between 1 and 100 (default: 50)
 * - include_deleted: boolean (default: false)
 * 
 * Headers:
 * - Authorization: Bearer <supabase_jwt_token> (required)
 * 
 * @param context - Astro API context
 * @returns JSON response with cards data and pagination metadata
 */
export async function GET(context: APIContext): Promise<Response> {
  try {
    // Step 1: Authenticate user
    const { user } = await getAuthenticatedUser(context);
    const userId = user.id;

    // Step 2: Parse and validate query parameters
    const url = new URL(context.request.url);
    const queryParams = {
      page: url.searchParams.get("page"),
      limit: url.searchParams.get("limit"),
      include_deleted: url.searchParams.get("include_deleted"),
    };

    // Validate query parameters using Zod schema
    const validationResult = listCardsQuerySchema.safeParse(queryParams);

    if (!validationResult.success) {
      // Format Zod errors into details object
      const details: Record<string, string> = {};
      validationResult.error.errors.forEach((err) => {
        const path = err.path.join(".");
        details[path] = err.message;
      });

      return new Response(
        JSON.stringify(createValidationError("Invalid query parameters", details)),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const { page, limit, include_deleted } = validationResult.data;

    // Step 3: Call service layer
    const cardService = new CardService(context.locals.supabase);
    const result = await cardService.listCards(userId, {
      page,
      limit,
      includeDeleted: include_deleted,
    });

    // Step 4: Calculate pagination metadata
    const totalPages = result.total > 0 ? Math.ceil(result.total / limit) : 0;

    // Step 5: Construct response
    const response: ListCardsResponse = {
      data: result.data,
      pagination: {
        page,
        limit,
        total: result.total,
        total_pages: totalPages,
      },
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
        },
      );
    }

    // Handle all other errors
    const errorResponse = handleApiError(error, {
      endpoint: "GET /api/cards",
      userId: context.locals.supabase ? "unknown" : undefined,
    });

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/**
 * POST /api/cards
 * 
 * Creates a new flashcard manually for the authenticated user.
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
    } catch (error) {
      return new Response(
        JSON.stringify(createValidationError("Invalid JSON in request body")),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Validate request body using Zod schema
    const validationResult = createCardSchema.safeParse(body);

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
        },
      );
    }

    const command = validationResult.data;

    // Step 3: Call service layer
    const cardService = new CardService(context.locals.supabase);
    const card = await cardService.createCard(command, userId);

    // Step 4: Construct response
    const response: CreateCardResponse = card;

    return new Response(JSON.stringify(response), {
      status: 201,
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
        },
      );
    }

    // Handle all other errors
    const errorResponse = handleApiError(error, {
      endpoint: "POST /api/cards",
      userId: context.locals.supabase ? "unknown" : undefined,
    });    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
