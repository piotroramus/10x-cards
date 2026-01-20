# OpenRouter Service Implementation Guide

## 1. Service Description

The OpenRouter Service is a TypeScript service module that provides a high-level, type-safe interface for interacting with the OpenRouter API to perform LLM-based chat completions. It encapsulates message composition (system, user, assistant), model parameter configuration, structured output formats (JSON schema), streaming and non-streaming responses, comprehensive error handling, and security best practices.

**Purpose**: Centralize all OpenRouter API interactions in a reusable service that can be used by other services (e.g., AI generation service) to perform LLM completions with proper error handling, retry logic, and structured response validation.

**Business Value**: Enables reliable AI-powered features (like flashcard generation) by providing a robust, tested abstraction over the OpenRouter API, handling edge cases, rate limits, and ensuring consistent error handling across the application.

**Tech Stack Alignment**:
- **TypeScript 5**: Strong typing for all interfaces and error types
- **Native Fetch API**: HTTP client (no additional dependencies)
- **Zod**: JSON schema validation for structured responses (already used in project)
- **Environment Variables**: API key management via `OPENROUTER_API_KEY`
- **Service Pattern**: Follows existing service patterns (`CardService`, `AnalyticsService`)

**Location**: `src/lib/services/openrouter.service.ts`

---

## 2. Constructor Description

The service should be implemented as a class with a constructor that accepts configuration:

```typescript
interface OpenRouterServiceConfig {
  apiKey: string;                    // Required: OpenRouter API key
  baseUrl?: string;                  // Optional: defaults to "https://openrouter.ai/api/v1"
  defaultModel?: string;              // Optional: default model name (e.g., "openai/gpt-4o")
  defaultTemperature?: number;        // Optional: default temperature (0.0-2.0)
  defaultMaxTokens?: number;          // Optional: default max tokens
  timeoutMs?: number;                 // Optional: request timeout in milliseconds (default: 30000)
  retryAttempts?: number;              // Optional: number of retry attempts for transient errors (default: 2)
  retryDelayMs?: number;             // Optional: initial retry delay in milliseconds (default: 1000)
}

class OpenRouterService {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly defaultModel?: string;
  private readonly defaultTemperature?: number;
  private readonly defaultMaxTokens?: number;
  private readonly timeoutMs: number;
  private readonly retryAttempts: number;
  private readonly retryDelayMs: number;

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
  }
}
```

**Constructor Responsibilities**:
1. Validate that API key is provided and non-empty
2. Set default base URL if not provided
3. Store default model parameters (model name, temperature, max_tokens)
4. Configure timeout and retry behavior
5. Ensure API key is never logged or exposed in error messages

---

## 3. Public Methods and Fields

### Public Fields

- `readonly config`: Read-only access to service configuration (for debugging/inspection)

### Public Methods

#### 3.1 `chat(options: ChatOptions): Promise<ChatResponse>`

Non-streaming chat completion method. Primary method for synchronous LLM interactions.

**Parameters**:
```typescript
interface ChatOptions {
  messages?: Message[];               // Array of message objects (system, user, assistant)
  prompt?: string;                    // Alternative: simple string prompt (converted to user message)
  model?: string;                     // Override default model
  temperature?: number;               // Override default temperature (0.0-2.0)
  maxTokens?: number;                  // Override default max tokens
  stop?: string | string[];          // Stop sequences
  responseFormat?: ResponseFormat;    // Structured output configuration
  stream?: false;                     // Must be false or omitted for non-streaming
}

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ResponseFormat {
  type: "json_object" | "json_schema";
  json_schema?: {
    name: string;
    strict: boolean;
    schema: Record<string, unknown>;  // JSON Schema object
  };
}
```

**Returns**: `Promise<ChatResponse>`
```typescript
interface ChatResponse {
  content: string;                    // The generated text content
  model: string;                      // Model used for generation
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: "stop" | "length" | "content_filter" | null;
}
```

**Example Usage**:
```typescript
const service = new OpenRouterService({ apiKey: process.env.OPENROUTER_API_KEY! });

const response = await service.chat({
  messages: [
    { role: "system", content: "You are a helpful assistant." },
    { role: "user", content: "What is 2+2?" }
  ],
  model: "openai/gpt-4o",
  temperature: 0.7,
  maxTokens: 100
});
```

#### 3.2 `chatStream(options: ChatStreamOptions): AsyncIterable<ChatStreamChunk>`

Streaming chat completion method. Returns an async iterator that yields incremental response chunks.

**Parameters**: Same as `ChatOptions` but with `stream: true`

**Returns**: `AsyncIterable<ChatStreamChunk>`
```typescript
interface ChatStreamChunk {
  delta: string;                      // Incremental text content
  model: string;                      // Model used
  finishReason?: "stop" | "length" | "content_filter" | null;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}
```

**Example Usage**:
```typescript
for await (const chunk of service.chatStream({
  messages: [{ role: "user", content: "Tell me a story" }],
  stream: true
})) {
  process.stdout.write(chunk.delta);
}
```

#### 3.3 `chatWithSchema<T>(options: ChatOptionsWithSchema<T>): Promise<T>`

Convenience method for structured responses with JSON schema validation. Returns typed result.

**Parameters**:
```typescript
interface ChatOptionsWithSchema<T> extends Omit<ChatOptions, "responseFormat"> {
  responseFormat: {
    type: "json_schema";
    json_schema: {
      name: string;
      strict: boolean;
      schema: Record<string, unknown>;
    };
  };
  parseResponse: (content: string) => T;  // Custom parser/validator
}
```

**Returns**: `Promise<T>` (typed parsed response)

**Example Usage**:
```typescript
interface WeatherResponse {
  location: string;
  forecast: string;
  high: number;
  low: number;
}

const weather = await service.chatWithSchema<WeatherResponse>({
  messages: [{ role: "user", content: "Weather in Boston?" }],
  responseFormat: {
    type: "json_schema",
    json_schema: {
      name: "WeatherResponse",
      strict: true,
      schema: {
        type: "object",
        properties: {
          location: { type: "string" },
          forecast: { type: "string" },
          high: { type: "number" },
          low: { type: "number" }
        },
        required: ["location", "forecast", "high", "low"],
        additionalProperties: false
      }
    }
  },
  parseResponse: (content) => {
    const parsed = JSON.parse(content);
    // Additional validation with Zod if needed
    return parsed as WeatherResponse;
  }
});
```

---

## 4. Private Methods and Fields

### Private Fields

```typescript
private readonly apiKey: string;
private readonly baseUrl: string;
private readonly defaultModel?: string;
private readonly defaultTemperature?: number;
private readonly defaultMaxTokens?: number;
private readonly timeoutMs: number;
private readonly retryAttempts: number;
private readonly retryDelayMs: number;
```

### Private Methods

#### 4.1 `private buildRequestHeaders(): HeadersInit`

Constructs HTTP headers for OpenRouter API requests.

**Returns**: Headers with Authorization and Content-Type
```typescript
{
  "Authorization": `Bearer ${this.apiKey}`,
  "Content-Type": "application/json",
  "HTTP-Referer": "<your-app-url>",  // Optional: for OpenRouter analytics
  "X-Title": "<your-app-name>"       // Optional: for OpenRouter analytics
}
```

#### 4.2 `private buildRequestBody(options: ChatOptions): Record<string, unknown>`

Merges default parameters with per-call overrides and constructs the request body.

**Responsibilities**:
1. Ensure either `messages` or `prompt` is provided (not both, not neither)
2. Convert `prompt` string to `messages` array if provided
3. Ensure system message is first if present
4. Merge default model parameters with overrides
5. Include `response_format` if specified
6. Validate parameter ranges (temperature 0-2, maxTokens > 0)

**Returns**: Request body object ready for JSON serialization

#### 4.3 `private async makeRequest<T>(endpoint: string, body: Record<string, unknown>, stream: boolean): Promise<T>`

Core HTTP request method with retry logic and timeout handling.

**Parameters**:
- `endpoint`: API endpoint path (e.g., "chat/completions")
- `body`: Request body object
- `stream`: Whether this is a streaming request

**Returns**: Parsed response or throws error

**Responsibilities**:
1. Construct full URL from baseUrl + endpoint
2. Set up AbortController for timeout
3. Implement retry logic with exponential backoff for transient errors (5xx, 429)
4. Handle network errors and timeouts
5. Parse JSON response (for non-streaming)
6. Map HTTP status codes to appropriate error types

#### 4.4 `private parseChatResponse(rawResponse: Record<string, unknown>): ChatResponse`

Parses OpenRouter API response into internal `ChatResponse` format.

**Input**: Raw API response object
**Returns**: Normalized `ChatResponse`

**Responsibilities**:
1. Extract `choices[0].message.content`
2. Extract `model` name
3. Extract `usage` (prompt_tokens, completion_tokens, total_tokens)
4. Extract `finish_reason`
5. Handle missing or malformed response structure

#### 4.5 `private async *parseStreamResponse(response: Response): AsyncGenerator<ChatStreamChunk>`

Parses Server-Sent Events (SSE) stream from OpenRouter API.

**Input**: Fetch Response object with stream
**Returns**: Async generator yielding `ChatStreamChunk` objects

**Responsibilities**:
1. Read SSE stream line by line
2. Parse `data:` lines as JSON
3. Extract `delta` from `choices[0].delta.content`
4. Accumulate content for final usage stats
5. Handle stream interruptions and errors
6. Yield incremental chunks

#### 4.6 `private validateSchema(responseContent: string, schema: Record<string, unknown>, strict: boolean): void`

Validates response content against JSON schema if `response_format` with `json_schema` is used.

**Parameters**:
- `responseContent`: The generated text content (should be JSON)
- `schema`: JSON Schema object
- `strict`: Whether to enforce strict validation

**Responsibilities**:
1. Parse response content as JSON
2. Use Zod or AJV to validate against schema
3. If `strict: true` and validation fails, throw `SchemaValidationError`
4. If `strict: false` and validation fails, log warning but don't throw

**Note**: For this project, prefer Zod since it's already used for validation elsewhere.

#### 4.7 `private handleError(error: unknown, context?: { endpoint?: string }): never`

Centralized error handling that maps various error types to domain-specific exceptions.

**Input**: Unknown error (could be fetch error, HTTP error, JSON parse error, etc.)
**Returns**: Never (always throws)

**Responsibilities**:
1. Detect error type (network, HTTP status, JSON parse, timeout)
2. Map to appropriate error class (see Error Handling section)
3. Include context in error message
4. Log error details (sanitized, no API keys)

#### 4.8 `private sleep(ms: number): Promise<void>`

Utility method for retry delays.

**Implementation**: `return new Promise(resolve => setTimeout(resolve, ms));`

#### 4.9 `private isRetryableError(status: number): boolean`

Determines if an HTTP status code indicates a retryable error.

**Returns**: `true` for 429, 500, 502, 503, 504; `false` otherwise

---

## 5. Error Handling

### Error Classes

Define custom error classes that extend `Error`:

```typescript
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
  constructor(message: string = "Invalid or missing OpenRouter API key") {
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
  constructor(message: string = "Insufficient credits or quota exceeded") {
    super(message, "PAYMENT_REQUIRED", 402);
    this.name = "PaymentRequiredError";
  }
}

/**
 * Model not found or unsupported
 */
export class NotFoundError extends OpenRouterError {
  constructor(message: string = "Model not found or unsupported") {
    super(message, "NOT_FOUND", 404);
    this.name = "NotFoundError";
  }
}

/**
 * Rate limit exceeded
 */
export class RateLimitError extends OpenRouterError {
  constructor(
    message: string = "Rate limit exceeded",
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
  constructor(message: string = "OpenRouter server error") {
    super(message, "SERVER_ERROR", 500);
    this.name = "ServerError";
  }
}

/**
 * Network error or timeout
 */
export class NetworkError extends OpenRouterError {
  constructor(message: string = "Network error or request timeout") {
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
  constructor(message: string = "Model returned invalid JSON") {
    super(message, "INVALID_JSON");
    this.name = "InvalidJsonError";
  }
}
```

### Error Mapping

| HTTP Status | Error Class | Retryable | Handling |
|------------|-------------|-----------|----------|
| 401 | `UnauthorizedError` | No | Throw immediately, no retry |
| 400 | `BadRequestError` | No | Throw with validation details |
| 402 | `PaymentRequiredError` | No | Throw, may trigger billing flow |
| 404 | `NotFoundError` | No | Throw, check model name |
| 429 | `RateLimitError` | Yes | Retry with exponential backoff, respect `Retry-After` header |
| 500, 502, 503, 504 | `ServerError` | Yes | Retry with exponential backoff |
| Network timeout | `NetworkError` | Yes | Retry if idempotent |
| JSON parse error | `InvalidJsonError` | No | Throw, may retry at higher level |
| Schema validation failure | `SchemaValidationError` | No | Throw if strict mode |

### Error Handling Flow

1. **Request Level**: Catch errors in `makeRequest()`, map HTTP status codes to error classes
2. **Response Parsing**: Catch JSON parse errors, wrap in `InvalidJsonError`
3. **Schema Validation**: Catch validation errors, wrap in `SchemaValidationError`
4. **Retry Logic**: Only retry transient errors (5xx, 429, network errors)
5. **Error Logging**: Log errors with sanitized context (no API keys, limited user content)

---

## 6. Security Considerations

### API Key Management

1. **Storage**: API key must come from environment variable `OPENROUTER_API_KEY`
2. **Validation**: Constructor validates API key is present and non-empty
3. **Logging**: Never log raw API key; mask in error messages (e.g., `sk-...****`)
4. **Transmission**: Always use HTTPS (enforced by using `https://` base URL)

### Input Sanitization

1. **Message Content**: Validate message content length (prevent DoS via huge inputs)
2. **Schema Validation**: Validate JSON schema structure to prevent injection via schema definitions
3. **Parameter Validation**: Validate numeric parameters (temperature 0-2, maxTokens > 0, etc.)

### Rate Limiting

1. **Client-Side**: Implement retry backoff to avoid hammering API
2. **Respect Headers**: Honor `Retry-After` header from 429 responses
3. **Circuit Breaker**: Consider implementing circuit breaker pattern for repeated failures

### Data Privacy

1. **Logging**: Don't log full user messages in production (may contain PII)
2. **Error Messages**: Don't expose internal details in error messages to end users
3. **Cleanup**: Ensure temporary data (stream buffers) are cleaned up

### Best Practices

1. **HTTPS Only**: Enforce HTTPS in base URL validation
2. **Timeout**: Always set reasonable timeouts to prevent hanging requests
3. **AbortController**: Use AbortController for cancellation and timeout handling
4. **Secrets Rotation**: Support API key rotation without service restart (via config refresh)

---

## 7. Step-by-Step Implementation Plan

### Step 1: Create Service File and Basic Structure

1. Create `src/lib/services/openrouter.service.ts`
2. Define all TypeScript interfaces (`ChatOptions`, `ChatResponse`, `Message`, `ResponseFormat`, etc.)
3. Define error classes (extend `Error` or create custom hierarchy)
4. Implement constructor with configuration validation

**Files to create/modify**:
- `src/lib/services/openrouter.service.ts` (new)

**Dependencies**: None (use native TypeScript and Fetch API)

### Step 2: Implement Private Helper Methods

1. Implement `buildRequestHeaders()`: Construct Authorization and Content-Type headers
2. Implement `buildRequestBody()`: Merge defaults, validate inputs, construct request body
3. Implement `sleep()`: Promise-based delay utility
4. Implement `isRetryableError()`: Check if status code is retryable

**Validation Logic**:
- Ensure `messages` or `prompt` is provided (not both, not neither)
- Convert `prompt` to `messages` array: `[{ role: "user", content: prompt }]`
- Ensure system message is first if present
- Validate temperature range: 0.0 <= temperature <= 2.0
- Validate maxTokens: > 0
- Validate model name is non-empty string if provided

### Step 3: Implement Core HTTP Request Method

1. Implement `makeRequest()` with:
   - URL construction (`${baseUrl}/${endpoint}`)
   - AbortController for timeout
   - Fetch with headers and body
   - Response status code checking
   - Retry logic with exponential backoff for retryable errors
   - Error mapping to error classes

**Retry Logic**:
```typescript
for (let attempt = 0; attempt <= this.retryAttempts; attempt++) {
  try {
    const response = await fetch(url, { ... });
    if (response.ok) return await parseResponse(response);
    
    const status = response.status;
    if (!this.isRetryableError(status) || attempt === this.retryAttempts) {
      throw this.mapHttpError(status, await response.text());
    }
    
    // Exponential backoff
    const delay = this.retryDelayMs * Math.pow(2, attempt);
    await this.sleep(delay);
  } catch (error) {
    if (attempt === this.retryAttempts) throw error;
    // Retry on network errors
    await this.sleep(this.retryDelayMs * Math.pow(2, attempt));
  }
}
```

### Step 4: Implement Response Parsing

1. Implement `parseChatResponse()`: Extract content, model, usage, finish_reason from API response
2. Handle edge cases:
   - Empty `choices` array
   - Missing `message.content`
   - Missing `usage` object
   - Invalid response structure

**Response Structure** (OpenRouter API):
```json
{
  "id": "gen-...",
  "model": "openai/gpt-4o",
  "choices": [{
    "message": {
      "role": "assistant",
      "content": "Generated text here"
    },
    "finish_reason": "stop"
  }],
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 20,
    "total_tokens": 30
  }
}
```

### Step 5: Implement Streaming Support

1. Implement `parseStreamResponse()`: Parse SSE stream
2. Handle SSE format:
   - Lines starting with `data: ` contain JSON
   - Lines starting with `:` are comments (ignore)
   - Empty lines separate events
   - `[DONE]` indicates end of stream
3. Extract incremental deltas from `choices[0].delta.content`
4. Accumulate final usage stats from last chunk

**SSE Format**:
```
data: {"id":"gen-...","model":"...","choices":[{"delta":{"content":"Hello"}}]}

data: {"choices":[{"delta":{"content":" world"}}]}

data: [DONE]
```

### Step 6: Implement Schema Validation

1. Install/use Zod for JSON schema validation (already in project)
2. Implement `validateSchema()`:
   - Parse response content as JSON
   - Convert JSON Schema to Zod schema (or use AJV)
   - Validate parsed JSON against schema
   - Throw `SchemaValidationError` if strict mode and validation fails
   - Log warning if lenient mode and validation fails

**Note**: For strict JSON schema validation, consider using `ajv` library for full JSON Schema support, or convert JSON Schema to Zod schema manually.

### Step 7: Implement Public Methods

1. Implement `chat()`:
   - Call `buildRequestBody()` to construct request
   - Call `makeRequest()` with endpoint "chat/completions"
   - Call `parseChatResponse()` to normalize response
   - If `responseFormat` with `json_schema` is provided, call `validateSchema()`
   - Return `ChatResponse`

2. Implement `chatStream()`:
   - Call `buildRequestBody()` with `stream: true`
   - Call `makeRequest()` and get Response object
   - Call `parseStreamResponse()` to get async generator
   - Return async generator

3. Implement `chatWithSchema()` (optional convenience method):
   - Call `chat()` with schema configuration
   - Parse response content as JSON
   - Call custom `parseResponse` function
   - Return typed result

### Step 8: Error Handling Integration

1. Implement `handleError()`: Map various error types to error classes
2. Map HTTP status codes in `makeRequest()`:
   - 401 → `UnauthorizedError`
   - 400 → `BadRequestError` (with response body details)
   - 402 → `PaymentRequiredError`
   - 404 → `NotFoundError`
   - 429 → `RateLimitError` (extract `Retry-After` header if present)
   - 5xx → `ServerError`
3. Catch network errors (fetch failures) → `NetworkError`
4. Catch JSON parse errors → `InvalidJsonError`
5. Catch schema validation errors → `SchemaValidationError`

### Step 9: Export Service and Types

1. Export `OpenRouterService` class as default export
2. Export all error classes
3. Export TypeScript interfaces for external use:
   - `ChatOptions`
   - `ChatResponse`
   - `ChatStreamChunk`
   - `Message`
   - `ResponseFormat`
   - `OpenRouterServiceConfig`

**File structure**:
```typescript
// Exports at end of file
export { OpenRouterService };
export type {
  ChatOptions,
  ChatResponse,
  ChatStreamChunk,
  Message,
  ResponseFormat,
  OpenRouterServiceConfig
};
export {
  OpenRouterError,
  UnauthorizedError,
  BadRequestError,
  PaymentRequiredError,
  NotFoundError,
  RateLimitError,
  ServerError,
  NetworkError,
  SchemaValidationError,
  InvalidJsonError
};
```

### Step 10: Create Factory Function (Optional)

Create a convenience factory function that reads from environment variables:

```typescript
/**
 * Creates an OpenRouterService instance from environment variables
 */
export function createOpenRouterService(
  overrides?: Partial<OpenRouterServiceConfig>
): OpenRouterService {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY environment variable is required");
  }

  return new OpenRouterService({
    apiKey,
    ...overrides
  });
}
```

### Step 11: Integration with Existing Services

Update `src/lib/services/ai-generation.service.ts` (or create it) to use `OpenRouterService`:

```typescript
import { OpenRouterService } from "./openrouter.service.ts";

class AIGenerationService {
  private openRouter: OpenRouterService;

  constructor() {
    this.openRouter = new OpenRouterService({
      apiKey: process.env.OPENROUTER_API_KEY!,
      defaultModel: "openai/gpt-4o",
      defaultTemperature: 0.7,
      defaultMaxTokens: 2000
    });
  }

  async generateProposals(text: string, userId: string) {
    // Use openRouter.chat() or openRouter.chatWithSchema()
    // Handle errors appropriately
  }
}
```

### Step 12: Testing Considerations

**Unit Tests** (future):
- Test message composition (system message ordering, prompt conversion)
- Test parameter merging (defaults vs overrides)
- Test error mapping (HTTP status → error classes)
- Test retry logic (exponential backoff, retryable vs non-retryable)
- Test schema validation (strict vs lenient)
- Test response parsing (normalize API response format)

**Integration Tests** (future):
- Test real API calls with mock API key (or use OpenRouter test endpoint)
- Test streaming responses
- Test structured responses with JSON schema
- Test error scenarios (invalid API key, rate limits, etc.)

### Step 13: Documentation

1. Add JSDoc comments to all public methods
2. Document error classes and when they're thrown
3. Provide usage examples in code comments
4. Document environment variable requirements

---

## Examples for Key Elements

### Example 1: System Message and User Message

```typescript
const response = await openRouterService.chat({
  messages: [
    {
      role: "system",
      content: "You are a helpful assistant that creates educational flashcards. Always provide clear, concise answers."
    },
    {
      role: "user",
      content: "Create a flashcard about photosynthesis."
    }
  ],
  model: "openai/gpt-4o",
  temperature: 0.7
});
```

### Example 2: Simple Prompt (Alternative to Messages)

```typescript
const response = await openRouterService.chat({
  prompt: "What is the capital of France?",
  model: "openai/gpt-4o"
});
// Internally converted to: messages: [{ role: "user", content: "What is the capital of France?" }]
```

### Example 3: Structured Response with JSON Schema

```typescript
const response = await openRouterService.chat({
  messages: [
    { role: "user", content: "Generate 3 flashcards about JavaScript from this text: 'JavaScript is a programming language...'" }
  ],
  model: "openai/gpt-4o",
  responseFormat: {
    type: "json_schema",
    json_schema: {
      name: "FlashcardProposals",
      strict: true,
      schema: {
        type: "object",
        properties: {
          flashcards: {
            type: "array",
            items: {
              type: "object",
              properties: {
                front: { type: "string" },
                back: { type: "string" }
              },
              required: ["front", "back"],
              additionalProperties: false
            }
          }
        },
        required: ["flashcards"],
        additionalProperties: false
      }
    }
  }
});

// Response.content will be valid JSON matching the schema
const parsed = JSON.parse(response.content);
// parsed.flashcards is an array of { front: string, back: string }
```

### Example 4: Model Parameters

```typescript
const response = await openRouterService.chat({
  messages: [{ role: "user", content: "Explain quantum computing" }],
  model: "anthropic/claude-3.5-sonnet",  // Model name with provider prefix
  temperature: 0.5,                       // Lower = more deterministic
  maxTokens: 500,                         // Limit response length
  stop: ["\n\n", "User:"]                 // Stop sequences
});
```

### Example 5: Streaming Response

```typescript
const stream = openRouterService.chatStream({
  messages: [{ role: "user", content: "Write a poem about coding" }],
  model: "openai/gpt-4o",
  stream: true
});

let fullContent = "";
for await (const chunk of stream) {
  fullContent += chunk.delta;
  process.stdout.write(chunk.delta);  // Stream to console
}
console.log("\n\nFinal usage:", chunk.usage);
```

### Example 6: Error Handling

```typescript
try {
  const response = await openRouterService.chat({
    messages: [{ role: "user", content: "Hello" }],
    model: "invalid-model-name"
  });
} catch (error) {
  if (error instanceof NotFoundError) {
    console.error("Model not found:", error.message);
  } else if (error instanceof RateLimitError) {
    console.error("Rate limited. Retry after:", error.retryAfter, "seconds");
  } else if (error instanceof PaymentRequiredError) {
    console.error("Quota exceeded. Please add credits.");
  } else if (error instanceof SchemaValidationError) {
    console.error("Schema validation failed:", error.validationErrors);
  } else {
    console.error("Unexpected error:", error);
  }
}
```

---

## Summary

This implementation plan provides a comprehensive guide for building a robust OpenRouter service that:

1. **Encapsulates API complexity**: Provides a clean, typed interface over OpenRouter API
2. **Handles all message types**: System, user, assistant messages with proper ordering
3. **Supports structured outputs**: JSON schema validation with strict mode
4. **Implements robust error handling**: Maps HTTP errors to domain-specific exceptions
5. **Includes retry logic**: Automatic retries for transient errors with exponential backoff
6. **Supports streaming**: Async iterators for incremental response processing
7. **Follows security best practices**: Secure API key handling, input validation, HTTPS enforcement
8. **Integrates with existing patterns**: Follows project structure and coding practices

The service can be used by other services (like `AIGenerationService`) to perform LLM completions with confidence that errors are handled properly, responses are validated, and the implementation follows best practices.
