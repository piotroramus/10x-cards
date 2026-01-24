import type { TrackEventCommand, TrackEventResponse, ErrorResponse } from "@/types";

/**
 * Error class for API errors with status code
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Parses error response from API
 */
async function parseErrorResponse(response: Response): Promise<ErrorResponse> {
  try {
    return await response.json();
  } catch {
    // If JSON parsing fails, return a generic error
    return {
      error: {
        code: "SERVER_ERROR",
        message: response.statusText || "An error occurred",
      },
    };
  }
}

/**
 * Creates an ApiError from a response
 */
async function createApiError(response: Response): Promise<ApiError> {
  const errorResponse = await parseErrorResponse(response);
  const { error } = errorResponse;
  return new ApiError(error.message, response.status, error.code, error.details);
}

/**
 * Tracks an analytics event
 * Note: This is typically called by AnalyticsProvider, not directly
 * @param command - Track event command
 * @param token - Bearer token for authentication
 * @returns Promise resolving to track event response
 * @throws ApiError if request fails
 */
export async function trackEvent(command: TrackEventCommand, token: string): Promise<TrackEventResponse> {
  const response = await fetch("/api/analytics/events", {
    method: "POST",
    headers: {
      Authorization: token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });

  if (!response.ok) {
    throw await createApiError(response);
  }

  return await response.json();
}
