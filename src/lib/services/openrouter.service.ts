/**
 * OpenRouter Service
 *
 * A high-level, type-safe interface for interacting with the OpenRouter API
 * to perform LLM-based chat completions with proper error handling, retry logic,
 * and structured response validation.
 */

// ============================================================================
// Type Definitions
// ============================================================================

export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ResponseFormat {
  type: "json_object" | "json_schema";
  json_schema?: {
    name: string;
    strict: boolean;
    schema: Record<string, unknown>;
  };
}

export interface ChatOptions {
  messages?: Message[];
  prompt?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stop?: string | string[];
  responseFormat?: ResponseFormat;
  stream?: false;
}

export interface ChatStreamOptions extends Omit<ChatOptions, "stream"> {
  stream: true;
}

export interface ChatResponse {
  content: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: "stop" | "length" | "content_filter" | null;
}

export interface ChatStreamChunk {
  delta: string;
  model: string;
  finishReason?: "stop" | "length" | "content_filter" | null;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface ChatOptionsWithSchema<T> extends Omit<ChatOptions, "responseFormat"> {
  responseFormat: {
    type: "json_schema";
    json_schema: {
      name: string;
      strict: boolean;
      schema: Record<string, unknown>;
    };
  };
  parseResponse: (content: string) => T;
}

export interface OpenRouterServiceConfig {
  apiKey: string;
  baseUrl?: string;
  defaultModel?: string;
  defaultTemperature?: number;
  defaultMaxTokens?: number;
  timeoutMs?: number;
  retryAttempts?: number;
  retryDelayMs?: number;
}

// ============================================================================
// Error Classes
// ============================================================================

/**
 * Base class for OpenRouter service errors
 */
export class OpenRouterError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "OpenRouterError";
  }
}

/**
 * Invalid API key or unauthorized request
 */
export class UnauthorizedError extends OpenRouterError {
  constructor(message = "Invalid or missing OpenRouter API key") {
    super(message, "UNAUTHORIZED", 401);
    this.name = "UnauthorizedError";
  }
}

/**
 * Invalid request parameters or missing required fields
 */
export class BadRequestError extends OpenRouterError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "BAD_REQUEST", 400, details);
    this.name = "BadRequestError";
  }
}

/**
 * Insufficient credits or quota exceeded
 */
export class PaymentRequiredError extends OpenRouterError {
  constructor(message = "Insufficient credits or quota exceeded") {
    super(message, "PAYMENT_REQUIRED", 402);
    this.name = "PaymentRequiredError";
  }
}

/**
 * Model not found or unsupported
 */
export class NotFoundError extends OpenRouterError {
  constructor(message = "Model not found or unsupported") {
    super(message, "NOT_FOUND", 404);
    this.name = "NotFoundError";
  }
}

/**
 * Rate limit exceeded
 */
export class RateLimitError extends OpenRouterError {
  constructor(
    message = "Rate limit exceeded",
    public readonly retryAfter?: number
  ) {
    super(message, "RATE_LIMIT", 429);
    this.name = "RateLimitError";
  }
}

/**
 * Server error from OpenRouter or provider
 */
export class ServerError extends OpenRouterError {
  constructor(message = "OpenRouter server error") {
    super(message, "SERVER_ERROR", 500);
    this.name = "ServerError";
  }
}

/**
 * Network error or timeout
 */
export class NetworkError extends OpenRouterError {
  constructor(message = "Network error or request timeout") {
    super(message, "NETWORK_ERROR");
    this.name = "NetworkError";
  }
}

/**
 * JSON schema validation error
 */
export class SchemaValidationError extends OpenRouterError {
  constructor(
    message: string,
    public readonly validationErrors: unknown[]
  ) {
    super(message, "SCHEMA_VALIDATION_ERROR");
    this.name = "SchemaValidationError";
  }
}

/**
 * Invalid JSON response from model
 */
export class InvalidJsonError extends OpenRouterError {
  constructor(message = "Model returned invalid JSON") {
    super(message, "INVALID_JSON");
    this.name = "InvalidJsonError";
  }
}

// ============================================================================
// Service Implementation
// ============================================================================

/**
 * Service for interacting with the OpenRouter API
 */
export class OpenRouterService {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly defaultModel?: string;
  private readonly defaultTemperature?: number;
  private readonly defaultMaxTokens?: number;
  private readonly timeoutMs: number;
  private readonly retryAttempts: number;
  private readonly retryDelayMs: number;

  /**
   * Read-only access to service configuration (for debugging/inspection)
   */
  public readonly config: Readonly<OpenRouterServiceConfig>;

  constructor(config: OpenRouterServiceConfig) {
    // Validate required API key
    if (!config.apiKey || config.apiKey.trim() === "") {
      throw new Error("OpenRouter API key is required");
    }

    // Store configuration
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || "https://openrouter.ai/api/v1";
    this.defaultModel = config.defaultModel;
    this.defaultTemperature = config.defaultTemperature;
    this.defaultMaxTokens = config.defaultMaxTokens;
    this.timeoutMs = config.timeoutMs || 30000;
    this.retryAttempts = config.retryAttempts ?? 2;
    this.retryDelayMs = config.retryDelayMs || 1000;

    // Store readonly config for external access
    this.config = Object.freeze({
      apiKey: this.maskApiKey(config.apiKey),
      baseUrl: this.baseUrl,
      defaultModel: this.defaultModel,
      defaultTemperature: this.defaultTemperature,
      defaultMaxTokens: this.defaultMaxTokens,
      timeoutMs: this.timeoutMs,
      retryAttempts: this.retryAttempts,
      retryDelayMs: this.retryDelayMs,
    });
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Masks API key for safe logging (shows first 4 chars and last 4 chars)
   */
  private maskApiKey(apiKey: string): string {
    if (apiKey.length <= 8) {
      return "****";
    }
    return `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}`;
  }

  /**
   * Constructs HTTP headers for OpenRouter API requests
   */
  private buildRequestHeaders(): HeadersInit {
    const headers: HeadersInit = {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    };

    // Optional headers for OpenRouter analytics
    // These can be configured via environment variables if needed
    const appUrl = import.meta.env.PUBLIC_APP_URL;
    const appName = import.meta.env.PUBLIC_APP_NAME;

    if (appUrl) {
      headers["HTTP-Referer"] = appUrl;
    }
    if (appName) {
      headers["X-Title"] = appName;
    }

    return headers;
  }

  /**
   * Merges default parameters with per-call overrides and constructs the request body
   */
  private buildRequestBody(options: ChatOptions | ChatStreamOptions): Record<string, unknown> {
    // Ensure either messages or prompt is provided (not both, not neither)
    if (options.messages && options.prompt) {
      throw new BadRequestError("Cannot provide both 'messages' and 'prompt'. Use one or the other.");
    }

    if (!options.messages && !options.prompt) {
      throw new BadRequestError("Either 'messages' or 'prompt' must be provided.");
    }

    // Convert prompt to messages array if provided
    let messages: Message[] = [];
    if (options.prompt) {
      messages = [{ role: "user", content: options.prompt }];
    } else if (options.messages) {
      messages = [...options.messages];
    }

    // Ensure system message is first if present
    const systemMessages = messages.filter((m) => m.role === "system");
    const nonSystemMessages = messages.filter((m) => m.role !== "system");
    messages = [...systemMessages, ...nonSystemMessages];

    // Merge default model parameters with overrides
    const model = options.model || this.defaultModel;
    if (!model) {
      throw new BadRequestError("Model must be provided either in config or options");
    }

    const temperature = options.temperature ?? this.defaultTemperature ?? 1.0;
    if (temperature < 0 || temperature > 2) {
      throw new BadRequestError(`Temperature must be between 0 and 2, got ${temperature}`);
    }

    const maxTokens = options.maxTokens ?? this.defaultMaxTokens;
    if (maxTokens !== undefined && maxTokens <= 0) {
      throw new BadRequestError(`maxTokens must be greater than 0, got ${maxTokens}`);
    }

    // Build request body
    const body: Record<string, unknown> = {
      model,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    };

    if (temperature !== undefined) {
      body.temperature = temperature;
    }

    if (maxTokens !== undefined) {
      body.max_tokens = maxTokens;
    }

    if (options.stop) {
      body.stop = Array.isArray(options.stop) ? options.stop : [options.stop];
    }

    if (options.responseFormat) {
      body.response_format = options.responseFormat;
    }

    // Handle stream option (ChatStreamOptions has stream: true, ChatOptions has stream?: false)
    if ("stream" in options && options.stream !== undefined) {
      body.stream = options.stream;
    }

    return body;
  }

  /**
   * Utility method for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Determines if an HTTP status code indicates a retryable error
   */
  private isRetryableError(status: number): boolean {
    return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
  }

  /**
   * Maps HTTP status codes to appropriate error classes
   */
  private mapHttpError(status: number, responseText?: string): OpenRouterError {
    const errorMessage = responseText || `HTTP ${status} error`;

    switch (status) {
      case 401:
        return new UnauthorizedError();
      case 400:
        return new BadRequestError(errorMessage);
      case 402:
        return new PaymentRequiredError();
      case 404:
        return new NotFoundError();
      case 429: {
        // Try to extract Retry-After header if available
        // Note: We'll need to pass headers separately if we want to extract this
        return new RateLimitError();
      }
      case 500:
      case 502:
      case 503:
      case 504:
        return new ServerError(errorMessage);
      default:
        return new OpenRouterError(`Unexpected HTTP status: ${status}`, "HTTP_ERROR", status);
    }
  }

  // ============================================================================
  // Core HTTP Request Method
  // ============================================================================

  /**
   * Core HTTP request method with retry logic and timeout handling
   */
  private async makeRequest<T>(endpoint: string, body: Record<string, unknown>, stream: boolean): Promise<T> {
    const url = `${this.baseUrl}/${endpoint}`;

    for (let attempt = 0; attempt <= this.retryAttempts; attempt++) {
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => {
        abortController.abort();
      }, this.timeoutMs);

      try {
        const response = await fetch(url, {
          method: "POST",
          headers: this.buildRequestHeaders(),
          body: JSON.stringify(body),
          signal: abortController.signal,
        });

        clearTimeout(timeoutId);

        // Handle successful response
        if (response.ok) {
          if (stream) {
            // For streaming, return the Response object
            return response as unknown as T;
          }
          // For non-streaming, parse JSON
          const data = await response.json();
          return data as T;
        }

        // Handle error responses
        const status = response.status;
        let errorText: string | undefined;
        try {
          errorText = await response.text();
        } catch {
          // Ignore text parsing errors
        }

        // Check if this is a retryable error
        if (!this.isRetryableError(status) || attempt === this.retryAttempts) {
          throw this.mapHttpError(status, errorText);
        }

        // Extract Retry-After header for rate limit errors
        if (status === 429) {
          const retryAfter = response.headers.get("Retry-After");
          if (retryAfter) {
            const retryAfterSeconds = parseInt(retryAfter, 10);
            if (!isNaN(retryAfterSeconds)) {
              await this.sleep(retryAfterSeconds * 1000);
              continue;
            }
          }
        }

        // Exponential backoff for retryable errors
        const delay = this.retryDelayMs * Math.pow(2, attempt);
        await this.sleep(delay);
      } catch (error) {
        clearTimeout(timeoutId);

        // Handle abort (timeout)
        if (error instanceof Error && error.name === "AbortError") {
          if (attempt === this.retryAttempts) {
            throw new NetworkError(`Request timeout after ${this.timeoutMs}ms`);
          }
          // Retry on timeout
          const delay = this.retryDelayMs * Math.pow(2, attempt);
          await this.sleep(delay);
          continue;
        }

        // Handle network errors
        if (error instanceof TypeError && error.message.includes("fetch")) {
          if (attempt === this.retryAttempts) {
            throw new NetworkError(`Network error: ${error.message}`);
          }
          // Retry on network errors
          const delay = this.retryDelayMs * Math.pow(2, attempt);
          await this.sleep(delay);
          continue;
        }

        // Re-throw non-retryable errors or if we've exhausted retries
        if (attempt === this.retryAttempts || error instanceof OpenRouterError) {
          throw error;
        }

        // For unknown errors, retry if we have attempts left
        const delay = this.retryDelayMs * Math.pow(2, attempt);
        await this.sleep(delay);
      }
    }

    // This should never be reached, but TypeScript needs it
    throw new NetworkError("Request failed after all retry attempts");
  }

  // ============================================================================
  // Response Parsing Methods
  // ============================================================================

  /**
   * Parses OpenRouter API response into internal ChatResponse format
   */
  private parseChatResponse(rawResponse: Record<string, unknown>): ChatResponse {
    // Validate response structure
    if (!rawResponse || typeof rawResponse !== "object") {
      throw new InvalidJsonError("Invalid response: expected object");
    }

    // Extract choices array
    const choices = rawResponse.choices;
    if (!Array.isArray(choices) || choices.length === 0) {
      throw new InvalidJsonError("Invalid response: choices array is missing or empty");
    }

    // Extract first choice
    const firstChoice = choices[0];
    if (!firstChoice || typeof firstChoice !== "object") {
      throw new InvalidJsonError("Invalid response: first choice is missing or invalid");
    }

    // Extract message content
    const message = firstChoice.message;
    if (!message || typeof message !== "object") {
      throw new InvalidJsonError("Invalid response: message is missing or invalid");
    }

    const content = message.content;
    if (typeof content !== "string") {
      throw new InvalidJsonError("Invalid response: message.content is missing or not a string");
    }

    // Extract model name
    const model = rawResponse.model;
    if (typeof model !== "string" || model.trim() === "") {
      throw new InvalidJsonError("Invalid response: model is missing or invalid");
    }

    // Extract finish reason
    const finishReason = firstChoice.finish_reason;
    const validFinishReasons = ["stop", "length", "content_filter", null];
    const normalizedFinishReason = validFinishReasons.includes(finishReason as string | null)
      ? (finishReason as "stop" | "length" | "content_filter" | null)
      : null;

    // Extract usage stats (may be missing in some cases)
    const usage = rawResponse.usage;
    let usageStats = {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    };

    if (usage && typeof usage === "object" && "prompt_tokens" in usage) {
      const usageObj = usage as {
        prompt_tokens?: unknown;
        completion_tokens?: unknown;
        total_tokens?: unknown;
      };
      usageStats = {
        promptTokens: typeof usageObj.prompt_tokens === "number" ? usageObj.prompt_tokens : 0,
        completionTokens: typeof usageObj.completion_tokens === "number" ? usageObj.completion_tokens : 0,
        totalTokens: typeof usageObj.total_tokens === "number" ? usageObj.total_tokens : 0,
      };
    }

    return {
      content,
      model,
      usage: usageStats,
      finishReason: normalizedFinishReason,
    };
  }

  // ============================================================================
  // Streaming Support
  // ============================================================================

  /**
   * Parses Server-Sent Events (SSE) stream from OpenRouter API
   */
  private async *parseStreamResponse(response: Response): AsyncGenerator<ChatStreamChunk> {
    if (!response.body) {
      throw new NetworkError("Response body is null");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let model: string | undefined;

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        // Decode chunk and add to buffer
        buffer += decoder.decode(value, { stream: true });

        // Process complete lines
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep incomplete line in buffer

        for (const line of lines) {
          const trimmedLine = line.trim();

          // Skip empty lines and comments
          if (trimmedLine === "" || trimmedLine.startsWith(":")) {
            continue;
          }

          // Check for [DONE] marker
          if (trimmedLine === "data: [DONE]") {
            // Yield final chunk with usage if available
            if (model) {
              yield {
                delta: "",
                model,
                finishReason: "stop",
              };
            }
            return;
          }

          // Parse data lines
          if (trimmedLine.startsWith("data: ")) {
            const jsonStr = trimmedLine.slice(6); // Remove "data: " prefix

            try {
              const data = JSON.parse(jsonStr);

              // Extract model from first chunk
              if (data.model && typeof data.model === "string") {
                model = data.model;
              }

              // Extract delta content
              const choices = data.choices;
              if (Array.isArray(choices) && choices.length > 0) {
                const choice = choices[0];
                const delta = choice.delta;

                if (delta && typeof delta === "object") {
                  const deltaContent = delta.content;
                  if (typeof deltaContent === "string") {
                    // Yield chunk
                    const chunk: ChatStreamChunk = {
                      delta: deltaContent,
                      model: model || "unknown",
                    };

                    // Extract finish reason if present
                    if (choice.finish_reason) {
                      chunk.finishReason = choice.finish_reason as "stop" | "length" | "content_filter" | null;
                    }

                    // Extract usage stats if present (usually in final chunk)
                    if (data.usage && typeof data.usage === "object") {
                      chunk.usage = {
                        promptTokens: typeof data.usage.prompt_tokens === "number" ? data.usage.prompt_tokens : 0,
                        completionTokens:
                          typeof data.usage.completion_tokens === "number" ? data.usage.completion_tokens : 0,
                        totalTokens: typeof data.usage.total_tokens === "number" ? data.usage.total_tokens : 0,
                      };
                    }

                    yield chunk;
                  }
                }
              }
            } catch (parseError) {
              // Log parse error but continue processing stream
              console.warn("Failed to parse SSE data line:", parseError);
            }
          }
        }
      }

      // Process any remaining buffer
      if (buffer.trim()) {
        const trimmedLine = buffer.trim();
        if (trimmedLine.startsWith("data: ") && trimmedLine !== "data: [DONE]") {
          const jsonStr = trimmedLine.slice(6);
          try {
            const data = JSON.parse(jsonStr);
            if (data.choices && Array.isArray(data.choices) && data.choices.length > 0) {
              const choice = data.choices[0];
              const delta = choice.delta;
              if (delta && typeof delta === "object" && typeof delta.content === "string") {
                if (model) {
                  yield {
                    delta: delta.content,
                    model,
                    finishReason: choice.finish_reason || undefined,
                  };
                }
              }
            }
          } catch {
            // Ignore parse errors in final buffer
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  // ============================================================================
  // Schema Validation
  // ============================================================================

  /**
   * Validates response content against JSON schema if response_format with json_schema is used
   *
   * Note: This implementation performs basic JSON validation. For full JSON Schema
   * validation, consider using a library like AJV. This method ensures the response
   * is valid JSON and matches basic structure expectations.
   */
  private validateSchema(responseContent: string, schema: Record<string, unknown>, strict: boolean): void {
    // Parse response content as JSON
    let parsed: unknown;
    try {
      parsed = JSON.parse(responseContent);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid JSON";
      throw new InvalidJsonError(`Failed to parse response as JSON: ${message}`);
    }

    // Basic validation: ensure parsed content is an object (for object schemas)
    if (schema.type === "object" && (typeof parsed !== "object" || parsed === null)) {
      const errorMessage = "Response does not match schema: expected object";
      if (strict) {
        throw new SchemaValidationError(errorMessage, [{ path: "", message: "Expected object, got " + typeof parsed }]);
      }
      console.warn(`Schema validation warning: ${errorMessage}`);
      return;
    }

    // Basic validation: ensure parsed content is an array (for array schemas)
    if (schema.type === "array" && !Array.isArray(parsed)) {
      const errorMessage = "Response does not match schema: expected array";
      if (strict) {
        throw new SchemaValidationError(errorMessage, [{ path: "", message: "Expected array, got " + typeof parsed }]);
      }
      console.warn(`Schema validation warning: ${errorMessage}`);
      return;
    }

    // For strict mode, perform additional validation
    if (strict) {
      // Check required properties if schema defines them
      if (
        schema.type === "object" &&
        schema.required &&
        Array.isArray(schema.required) &&
        typeof parsed === "object" &&
        parsed !== null
      ) {
        const required = schema.required as string[];
        const parsedObj = parsed as Record<string, unknown>;
        const missingProperties: string[] = [];

        for (const prop of required) {
          if (!(prop in parsedObj)) {
            missingProperties.push(prop);
          }
        }

        if (missingProperties.length > 0) {
          throw new SchemaValidationError(
            `Missing required properties: ${missingProperties.join(", ")}`,
            missingProperties.map((prop) => ({
              path: prop,
              message: `Required property '${prop}' is missing`,
            }))
          );
        }
      }

      // Check additionalProperties if schema defines it
      if (
        schema.type === "object" &&
        schema.additionalProperties === false &&
        typeof parsed === "object" &&
        parsed !== null &&
        schema.properties &&
        typeof schema.properties === "object"
      ) {
        const parsedObj = parsed as Record<string, unknown>;
        const allowedProperties = new Set(Object.keys(schema.properties as Record<string, unknown>));
        const extraProperties: string[] = [];

        for (const key of Object.keys(parsedObj)) {
          if (!allowedProperties.has(key)) {
            extraProperties.push(key);
          }
        }

        if (extraProperties.length > 0) {
          throw new SchemaValidationError(
            `Additional properties not allowed: ${extraProperties.join(", ")}`,
            extraProperties.map((prop) => ({
              path: prop,
              message: `Additional property '${prop}' is not allowed`,
            }))
          );
        }
      }
    }
  }

  // ============================================================================
  // Public Methods
  // ============================================================================

  /**
   * Non-streaming chat completion method
   * Primary method for synchronous LLM interactions
   *
   * @param options - Chat options including messages, model, temperature, etc.
   * @returns Promise resolving to ChatResponse with content, model, usage, and finish reason
   * @throws OpenRouterError for various error conditions
   */
  async chat(options: ChatOptions): Promise<ChatResponse> {
    const body = this.buildRequestBody({ ...options, stream: false });
    const rawResponse = await this.makeRequest<Record<string, unknown>>("chat/completions", body, false);

    const response = this.parseChatResponse(rawResponse);

    // If responseFormat with json_schema is provided, validate schema
    if (options.responseFormat?.type === "json_schema" && options.responseFormat.json_schema) {
      this.validateSchema(
        response.content,
        options.responseFormat.json_schema.schema,
        options.responseFormat.json_schema.strict
      );
    }

    return response;
  }

  /**
   * Streaming chat completion method
   * Returns an async iterator that yields incremental response chunks
   *
   * @param options - Chat stream options with stream: true
   * @returns Async iterable yielding ChatStreamChunk objects
   * @throws OpenRouterError for various error conditions
   */
  async *chatStream(options: ChatStreamOptions): AsyncIterable<ChatStreamChunk> {
    const body = this.buildRequestBody(options);
    const response = await this.makeRequest<Response>("chat/completions", body, true);

    yield* this.parseStreamResponse(response);
  }

  /**
   * Convenience method for structured responses with JSON schema validation
   * Returns typed result after parsing and validating response
   *
   * @param options - Chat options with responseFormat.json_schema and parseResponse function
   * @returns Promise resolving to typed parsed response
   * @throws OpenRouterError for various error conditions
   * @throws SchemaValidationError if schema validation fails in strict mode
   */
  async chatWithSchema<T>(options: ChatOptionsWithSchema<T>): Promise<T> {
    const response = await this.chat(options);
    return options.parseResponse(response.content);
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Creates an OpenRouterService instance from environment variables
 *
 * @param overrides - Optional configuration overrides
 * @returns OpenRouterService instance
 * @throws Error if OPENROUTER_API_KEY environment variable is not set
 *
 * @example
 * ```typescript
 * // Basic usage with environment variable
 * const service = createOpenRouterService();
 *
 * // With default model
 * const service = createOpenRouterService({
 *   defaultModel: "openai/gpt-4o",
 *   defaultTemperature: 0.7
 * });
 * ```
 */
export function createOpenRouterService(overrides?: Partial<OpenRouterServiceConfig>): OpenRouterService {
  const apiKey = import.meta.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY environment variable is required");
  }

  return new OpenRouterService({
    apiKey,
    ...overrides,
  });
}
