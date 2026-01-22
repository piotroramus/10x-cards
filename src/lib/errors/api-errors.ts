import type { ErrorCode, ErrorResponse } from "../../types.ts";

/**
 * Not found error thrown when a resource is not found or not owned by user
 */
export class NotFoundError extends Error {
  constructor(message: string = "Resource not found") {
    super(message);
    this.name = "NotFoundError";
  }
}

/**
 * Creates a validation error response
 * 
 * @param message - Error message
 * @param details - Optional validation error details (field-specific errors)
 * @returns ErrorResponse object with VALIDATION_ERROR code
 */
export function createValidationError(
  message: string = "Invalid request data",
  details?: Record<string, unknown>,
): ErrorResponse {
  return {
    error: {
      code: "VALIDATION_ERROR",
      message,
      details,
    },
  };
}

/**
 * Creates an authentication error response
 * 
 * @param message - Error message
 * @returns ErrorResponse object with AUTHENTICATION_ERROR code
 */
export function createAuthenticationError(
  message: string = "Missing or invalid authentication token",
): ErrorResponse {
  return {
    error: {
      code: "AUTHENTICATION_ERROR",
      message,
    },
  };
}

/**
 * Creates a not found error response
 * 
 * @param message - Error message
 * @returns ErrorResponse object with NOT_FOUND code
 */
export function createNotFoundError(
  message: string = "Resource not found",
): ErrorResponse {
  return {
    error: {
      code: "NOT_FOUND",
      message,
    },
  };
}

/**
 * Creates a server error response
 * 
 * @param message - Error message (should be generic for security)
 * @returns ErrorResponse object with SERVER_ERROR code
 */
export function createServerError(
  message: string = "An internal server error occurred",
): ErrorResponse {
  return {
    error: {
      code: "SERVER_ERROR",
      message,
    },
  };
}

/**
 * Creates a quota exceeded error response
 * 
 * @param message - Error message
 * @returns ErrorResponse object with QUOTA_EXCEEDED code
 */
export function createQuotaExceededError(
  message: string = "Quota exceeded",
): ErrorResponse {
  return {
    error: {
      code: "QUOTA_EXCEEDED",
      message,
    },
  };
}

/**
 * Handles API errors and returns appropriate error response
 * 
 * This function provides a centralized way to handle different types of errors
 * and convert them to the standard ErrorResponse format.
 * 
 * @param error - The error to handle (can be Error, string, or unknown)
 * @param context - Optional context information for logging
 * @returns ErrorResponse object with appropriate error code
 */
export function handleApiError(
  error: unknown,
  context?: { endpoint?: string; userId?: string },
): ErrorResponse {
  // Handle known error types
  if (error instanceof Error) {
    // Check for AuthenticationError (from auth.ts)
    if (error.name === "AuthenticationError") {
      return createAuthenticationError(error.message);
    }

    // Check for NotFoundError
    if (error.name === "NotFoundError") {
      return createNotFoundError(error.message);
    }

    // Log server errors (but don't expose details to client)
    if (context) {
      console.error(`API Error in ${context.endpoint || "unknown"}:`, {
        message: error.message,
        stack: error.stack,
        userId: context.userId,
      });
    }

    return createServerError();
  }

  // Handle string errors
  if (typeof error === "string") {
    if (context) {
      console.error(`API Error in ${context.endpoint || "unknown"}:`, error);
    }
    return createServerError();
  }

  // Handle unknown error types
  if (context) {
    console.error(`Unknown API Error in ${context.endpoint || "unknown"}:`, error);
  }
  return createServerError();
}

