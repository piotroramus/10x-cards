import { createClient } from "@supabase/supabase-js";
import type { APIContext } from "astro";

import type { Database } from "../db/database.types.ts";

/**
 * Authentication error thrown when JWT token is missing or invalid
 */
export class AuthenticationError extends Error {
  constructor(message: string = "Missing or invalid authentication token") {
    super(message);
    this.name = "AuthenticationError";
  }
}

/**
 * Extracts and validates the authenticated user from the JWT token in the request.
 * 
 * Creates a Supabase client with the provided token to validate it and retrieve the user.
 * 
 * In development mode (DISABLE_AUTH=true), returns a mock user instead of validating.
 * 
 * @param context - Astro API context containing request headers and locals
 * @returns Object containing the authenticated user with id
 * @throws {AuthenticationError} If token is missing, invalid, or expired (unless DISABLE_AUTH=true)
 * 
 * @example
 * ```typescript
 * const { user } = await getAuthenticatedUser(context);
 * const userId = user.id;
 * ```
 */
export async function getAuthenticatedUser(context: APIContext) {
  // Development mode: bypass authentication
  const disableAuth = import.meta.env.DISABLE_AUTH === "true";
  
  if (disableAuth) {
    console.warn("⚠️  AUTHENTICATION DISABLED - Development mode only!");
    // Return a mock user for development
    return {
      user: {
        id: import.meta.env.MOCK_USER_ID || "00000000-0000-0000-0000-000000000000",
        email: "dev@example.com",
        // Add other required user properties as needed
      } as { id: string; email: string },
    };
  }

  const authHeader = context.request.headers.get("Authorization");

  if (!authHeader) {
    throw new AuthenticationError("Missing Authorization header");
  }

  // Extract token from "Bearer <token>" format
  const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!tokenMatch || !tokenMatch[1]) {
    throw new AuthenticationError("Invalid Authorization header format. Expected: Bearer <token>");
  }

  const token = tokenMatch[1];

  // Create a Supabase client with the token to validate it
  // We use the same URL and anon key from environment, but set the auth token
  const supabaseUrl = import.meta.env.SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.SUPABASE_KEY;
  
  const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  // Validate token and get user
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    throw new AuthenticationError("Invalid or expired authentication token");
  }

  return { user };
}

