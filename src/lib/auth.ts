import { createClient } from "@supabase/supabase-js";
import type { APIContext } from "astro";

import type { Database } from "../db/database.types.ts";

/**
 * Authentication error thrown when JWT token is missing or invalid
 */
export class AuthenticationError extends Error {
  constructor(message = "Missing or invalid authentication token") {
    super(message);
    this.name = "AuthenticationError";
  }
}

/**
 * Extracts and validates the authenticated user from the request.
 *
 * Uses the Supabase instance from context.locals which is configured with cookie-based auth.
 * Falls back to Authorization header if cookies are not available (for backward compatibility).
 *
 * @param context - Astro API context containing request headers and locals
 * @returns Object containing the authenticated user with id
 * @throws {AuthenticationError} If token is missing, invalid, or expired
 *
 * @example
 * ```typescript
 * const { user } = await getAuthenticatedUser(context);
 * const userId = user.id;
 * ```
 */
export async function getAuthenticatedUser(context: APIContext) {
  // First, try to use Supabase instance from locals (cookie-based auth)
  if (context.locals.supabase) {
    const {
      data: { user },
      error,
    } = await context.locals.supabase.auth.getUser();

    if (error || !user) {
      throw new AuthenticationError("Invalid or expired authentication token");
    }

    return { user };
  }

  // Fallback: Extract from Authorization header (for backward compatibility)
  const authHeader = context.request.headers.get("Authorization");

  if (!authHeader) {
    throw new AuthenticationError("Missing authentication");
  }

  // Extract token from "Bearer <token>" format
  const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!tokenMatch || !tokenMatch[1]) {
    throw new AuthenticationError("Invalid Authorization header format. Expected: Bearer <token>");
  }

  const token = tokenMatch[1];

  // Create a Supabase client with the token to validate it
  // Use PUBLIC_ prefixed vars (accessible on both server and client)
  // Fall back to non-prefixed for backward compatibility
  const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || import.meta.env.SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_KEY || import.meta.env.SUPABASE_KEY;

  const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  // Validate token and get user
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new AuthenticationError("Invalid or expired authentication token");
  }

  return { user };
}
