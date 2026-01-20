import type {
  GenerateProposalsCommand,
  GenerateProposalsResponse,
  AcceptProposalCommand,
  AcceptProposalResponse,
  CreateCardCommand,
  CreateCardResponse,
  ErrorResponse,
  CardProposal,
} from "@/types";

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
 * Generates AI card proposals from text
 * @param command - Generate proposals command with text
 * @param token - Bearer token for authentication
 * @returns Promise resolving to generate proposals response
 * @throws ApiError if request fails
 */
export async function generateProposals(
  command: GenerateProposalsCommand,
  token: string | null
): Promise<GenerateProposalsResponse> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  
  // Add Authorization header if token is provided
  if (token) {
    headers.Authorization = token;
  }

  const response = await fetch("/api/cards/generate", {
    method: "POST",
    headers,
    body: JSON.stringify(command),
  });

  if (!response.ok) {
    throw await createApiError(response);
  }

  return await response.json();
}

/**
 * Accepts an AI-generated proposal and persists it as a card
 * @param command - Accept proposal command with front and back
 * @param token - Bearer token for authentication
 * @returns Promise resolving to accepted card response
 * @throws ApiError if request fails
 */
export async function acceptProposal(
  command: AcceptProposalCommand,
  token: string | null
): Promise<AcceptProposalResponse> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  
  if (token) {
    headers.Authorization = token;
  }

  const response = await fetch("/api/cards/accept", {
    method: "POST",
    headers,
    body: JSON.stringify(command),
  });

  if (!response.ok) {
    throw await createApiError(response);
  }

  return await response.json();
}

/**
 * Creates a card manually
 * @param command - Create card command with front and back
 * @param token - Bearer token for authentication
 * @returns Promise resolving to created card response
 * @throws ApiError if request fails
 */
export async function createCard(
  command: CreateCardCommand,
  token: string | null
): Promise<CreateCardResponse> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  
  if (token) {
    headers.Authorization = token;
  }

  const response = await fetch("/api/cards", {
    method: "POST",
    headers,
    body: JSON.stringify(command),
  });

  if (!response.ok) {
    throw await createApiError(response);
  }

  return await response.json();
}

/**
 * Maps API error codes to ErrorBannerState types
 */
export function mapErrorToBannerState(error: ApiError): {
  type: "QUOTA_EXCEEDED" | "NETWORK_ERROR" | "INVALID_JSON" | "SERVER_ERROR" | "VALIDATION_ERROR";
  message: string;
  retryable: boolean;
} {
  // Network errors (fetch failures)
  if (error.message.includes("fetch") || error.message.includes("network")) {
    return {
      type: "NETWORK_ERROR",
      message: "Connection error. Please check your internet and try again.",
      retryable: true,
    };
  }

  // Quota exceeded (402 Payment Required)
  if (error.status === 402 || error.code === "QUOTA_EXCEEDED") {
    return {
      type: "QUOTA_EXCEEDED",
      message: "Generation unavailable due to quota limits. Please try again later or create cards manually.",
      retryable: false,
    };
  }

  // Invalid JSON (422 Unprocessable Entity)
  if (error.status === 422 || error.code === "INVALID_JSON") {
    return {
      type: "INVALID_JSON",
      message: "AI returned invalid response. Please try again.",
      retryable: true,
    };
  }

  // Validation errors (400 Bad Request)
  if (error.status === 400 || error.code === "VALIDATION_ERROR") {
    return {
      type: "VALIDATION_ERROR",
      message: error.message || "Validation error. Please check your input.",
      retryable: false,
    };
  }

  // Server errors (500, 503)
  if (error.status >= 500) {
    return {
      type: "SERVER_ERROR",
      message: "Server error. Please try again later.",
      retryable: true,
    };
  }

  // Default to server error
  return {
    type: "SERVER_ERROR",
    message: error.message || "An error occurred. Please try again.",
    retryable: true,
  };
}

