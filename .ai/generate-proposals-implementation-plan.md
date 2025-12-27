# API Endpoint Implementation Plan: Generate Card Proposals (POST /api/cards/generate)

## 1. Endpoint Overview

The Generate Card Proposals endpoint generates AI flashcard proposals from pasted English text using OpenRouter. The endpoint validates input length, calls the AI model, validates output schema and character limits, and creates an analytics event `generate`. The proposals are not persisted; they must be accepted via `/api/cards/accept` endpoint.

**Purpose**: Generate AI-powered flashcard proposals from user-provided text, enabling efficient card creation through AI assistance.

**Business Value**: Core feature that differentiates the application by providing AI-powered card generation, significantly reducing the time users spend creating flashcards manually.

## 2. Request Details

- **HTTP Method**: `POST`
- **URL Structure**: `/api/cards/generate`
- **Parameters**: None
- **Request Headers**:
  - `Authorization: Bearer <supabase_jwt_token>` (required)
  - `Content-Type: application/json` (required)
- **Request Body**:
```json
{
  "text": "string"
}
```

## 3. Used Types

### Request Types
- `GenerateProposalsCommand` (from `src/types.ts`):
  ```typescript
  {
    text: string;
  }
  ```

### Response Types
- `GenerateProposalsResponse` (from `src/types.ts`):
  ```typescript
  {
    proposals: CardProposal[];
    count: number;
  }
  ```
- `CardProposal` (from `src/types.ts`):
  ```typescript
  {
    front: string;
    back: string;
  }
  ```

### Error Response Type
- `ErrorResponse` (from `src/types.ts`)

## 4. Response Details

### Success Response (200 OK)
```json
{
  "proposals": [
    {
      "front": "string",
      "back": "string"
    }
  ],
  "count": 5
}
```

### Error Responses

#### 401 Unauthorized
```json
{
  "error": {
    "code": "AUTHENTICATION_ERROR",
    "message": "Missing or invalid authentication token"
  }
}
```

#### 400 Bad Request (Validation Error)
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Input text exceeds 10,000 character limit or is empty"
  }
}
```

#### 402 Payment Required
```json
{
  "error": {
    "code": "QUOTA_EXCEEDED",
    "message": "OpenRouter quota or rate limit exceeded"
  }
}
```

#### 422 Unprocessable Entity
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "AI model returned invalid proposals"
  }
}
```

#### 429 Too Many Requests
```json
{
  "error": {
    "code": "QUOTA_EXCEEDED",
    "message": "Rate limit exceeded. Please try again later"
  }
}
```

#### 500 Internal Server Error
```json
{
  "error": {
    "code": "SERVER_ERROR",
    "message": "An internal server error occurred"
  }
}
```

#### 503 Service Unavailable
```json
{
  "error": {
    "code": "SERVER_ERROR",
    "message": "AI service temporarily unavailable"
  }
}
```

## 5. Data Flow

1. **Request Reception**: Astro API route handler receives POST request at `/api/cards/generate`
2. **Authentication**: Extract and validate JWT token from `Authorization` header
3. **User Identification**: Extract `user_id` from validated JWT token claims
4. **Request Body Validation**: Parse and validate JSON body using Zod schema:
   - `text`: Required, non-empty string, max 10,000 characters
5. **Service Layer Call**: Call `AIGenerationService.generateProposals(text, userId)`
6. **AI Generation**: Service calls OpenRouter API:
   - Construct prompt for AI model
   - Request up to 5 proposals
   - Use budget-friendly model (per tech stack)
   - Handle retries (up to 2 retries on invalid JSON)
7. **Output Validation**: Service validates AI response:
   - Validate JSON schema: `{ front: string, back: string }[]`
   - Validate each proposal's `front <= 200` and `back <= 500` characters
   - Filter out invalid proposals (exceeding character limits)
8. **Analytics Event Creation**: Service creates analytics event:
   - `event_type = 'generate'`
   - `origin = null`
   - `context = {}` (no raw source text stored)
9. **Response Construction**: Build `GenerateProposalsResponse` with valid proposals
10. **Response Return**: Return JSON response with `200 OK` status

### External Service Interaction

- **Service**: OpenRouter API
- **Endpoint**: OpenRouter API endpoint (check OpenRouter documentation)
- **Authentication**: Use `OPENROUTER_API_KEY` from environment variables
- **Model**: Budget-friendly model (e.g., GPT-3.5-turbo or similar)
- **Request Pattern**:
  ```typescript
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openRouterApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'openai/gpt-3.5-turbo', // or budget model
      messages: [
        {
          role: 'system',
          content: 'You are a flashcard generator. Generate up to 5 flashcards from the provided text...'
        },
        {
          role: 'user',
          content: text
        }
      ],
      response_format: { type: 'json_object' } // if supported
    })
  });
  ```

### Analytics Event Creation

- **Table**: `analytics_events`
- **Insert Pattern**:
  ```typescript
  await supabase
    .from('analytics_events')
    .insert({
      user_id: userId,
      event_type: 'generate',
      origin: null,
      context: {}
    });
  ```

## 6. Security Considerations

### Authentication
- Same as Create Card endpoint

### Authorization
- **User-Based**: All authenticated users can generate proposals
- **Rate Limiting**: Consider implementing rate limiting to prevent abuse (future)

### Input Validation
- **Character Limit**: Enforce `text.length <= 10,000` characters
- **Required Field**: Validate `text` is non-empty string
- **XSS Prevention**: Sanitize input text (though it's not stored)
- **Privacy**: Never log or store raw source text in server logs or analytics

### Data Exposure
- **No Storage**: Proposals are not persisted (only returned to client)
- **Privacy**: Raw source text is never stored or logged
- **Error Messages**: Do not expose internal AI service details

### API Key Security
- **Environment Variable**: Store `OPENROUTER_API_KEY` in environment variables
- **Never Expose**: Never include API key in client-side code or error messages
- **Rotation**: Support API key rotation (environment variable update)

## 7. Error Handling

### Error Scenarios and Status Codes

#### 1. Authentication Errors (401 Unauthorized)
- Same as Create Card endpoint

#### 2. Validation Errors (400 Bad Request)
- **Scenario**: Missing `text` field
- **Scenario**: `text` is empty string
- **Scenario**: `text` exceeds 10,000 characters
- **Scenario**: Invalid JSON in request body
- **Handling**: Return `400` with `VALIDATION_ERROR` code
- **Logging**: Log validation errors (sanitize text content)

#### 3. Quota/Rate Limit Errors (402 Payment Required / 429 Too Many Requests)
- **Scenario**: OpenRouter quota exceeded (user or org daily cap)
- **Scenario**: OpenRouter rate limit exceeded
- **Handling**: 
  - Return `402` for quota exceeded
  - Return `429` for rate limit (with retry-after header if available)
- **Logging**: Log at WARN level with user identifier

#### 4. AI Service Errors (422 Unprocessable Entity)
- **Scenario**: AI model returned invalid JSON (after retries)
- **Scenario**: AI model returned proposals exceeding character limits (after filtering)
- **Scenario**: AI model returned empty proposals array
- **Handling**: Return `422` with `VALIDATION_ERROR` code and user-friendly message
- **Logging**: Log at WARN level (AI service issue, not user error)

#### 5. Network/Service Errors (500 Internal Server Error / 503 Service Unavailable)
- **Scenario**: OpenRouter API network error
- **Scenario**: OpenRouter API server error
- **Scenario**: AI service temporarily unavailable
- **Handling**: 
  - Return `500` for unexpected errors
  - Return `503` for service unavailable
- **Logging**: Log at ERROR level with full error details (without exposing API keys)

### Retry Logic

- **Invalid JSON Response**: Retry up to 2 times if AI returns invalid JSON
- **Network Errors**: Consider retry with exponential backoff for transient network errors
- **Rate Limits**: Do not retry on rate limit errors (return error immediately)

### Error Response Format
All errors follow the `ErrorResponse` type structure.

### Error Logging Strategy
- **Authentication Errors**: Log at WARN level
- **Validation Errors**: Log at INFO level (sanitize text content)
- **Quota/Rate Limit Errors**: Log at WARN level with user identifier
- **AI Service Errors**: Log at WARN level (service issue)
- **Network/Service Errors**: Log at ERROR level with full details (redact API keys)
- **Never Log**: Raw source text, API keys, full AI responses

## 8. Performance Considerations

### External Service Performance
- **OpenRouter Latency**: AI generation can take several seconds
- **Timeout**: Set reasonable timeout (e.g., 30 seconds) for OpenRouter API calls
- **Async Processing**: Consider async processing for long-running generations (future)

### Retry Strategy
- **Retry Count**: Up to 2 retries for invalid JSON responses
- **Retry Delay**: Consider exponential backoff for retries
- **Timeout**: Each retry should have its own timeout

### Caching Opportunities (Future)
- Consider caching AI responses for identical input text (with user consent)
- Cache with TTL to avoid regenerating same proposals

### Cost Optimization
- **Budget Model**: Use budget-friendly AI model (per tech stack)
- **Proposal Limit**: Request up to 5 proposals (not more)
- **Input Length**: 10,000 character limit helps control costs

## 9. Implementation Steps

### Step 1: Install Dependencies
1. No additional dependencies needed (use native `fetch` or consider `axios` if needed)

### Step 2: Create Validation Schema
1. Create `src/lib/validations/ai-generation.ts`:
   - Define Zod schema for `GenerateProposalsCommand`:
     ```typescript
     const generateProposalsSchema = z.object({
       text: z.string().min(1, "Text cannot be empty").max(10000, "Text must be 10,000 characters or less"),
     });
     ```

### Step 3: Create AI Generation Service
1. Create `src/lib/services/ai-generation.service.ts`:
   - Function `generateProposals(text: string, userId: string)`: 
     - Parameters: `text` (validated), `userId` (from JWT)
     - Calls OpenRouter API with proper prompt
     - Handles retries for invalid JSON (up to 2 retries)
     - Validates AI response schema
     - Filters invalid proposals (exceeding character limits)
     - Creates analytics event `generate` (non-blocking)
     - Returns `{ proposals: CardProposal[], count: number }`
     - Handle OpenRouter errors and transform to appropriate error codes

### Step 4: Create Prompt Template
1. Create `src/lib/prompts/flashcard-generation.ts`:
   - Define system and user prompt templates
   - Include instructions for JSON format
   - Include character limit constraints in prompt

### Step 5: Create API Route Handler
1. Create `src/pages/api/cards/generate.ts`:
   - Export `export const prerender = false;`
   - Implement `POST` handler:
     - Extract and validate authentication
     - Parse and validate request body using Zod schema
     - Call `AIGenerationService.generateProposals(text, userId)`
     - Return JSON response with `200 OK` status
   - Implement error handling:
     - Catch authentication errors → return `401`
     - Catch validation errors → return `400`
     - Catch quota/rate limit errors → return `402` or `429`
     - Catch AI service errors → return `422`
     - Catch network/service errors → return `500` or `503`
     - Use consistent `ErrorResponse` format

### Step 6: Environment Variables
1. Ensure `OPENROUTER_API_KEY` is set in environment variables
2. Update `src/env.d.ts` to include `OPENROUTER_API_KEY` type

### Step 7: Error Handling
1. Update `src/lib/errors/api-errors.ts`:
   - Add `createQuotaExceededError(message)` factory function
   - Update `handleApiError()` to handle OpenRouter-specific errors

### Step 8: Code Review Checklist
- [ ] Authentication is properly validated
- [ ] Request body is validated with Zod (text length, required field)
- [ ] OpenRouter API key is stored in environment variables
- [ ] AI prompt includes character limit constraints
- [ ] Retry logic for invalid JSON (up to 2 retries)
- [ ] Output validation (JSON schema, character limits)
- [ ] Invalid proposals are filtered out
- [ ] Analytics event is created (non-blocking)
- [ ] Raw source text is never logged or stored
- [ ] Error responses follow `ErrorResponse` format
- [ ] Appropriate error codes for different scenarios (402, 422, 429, 503)
- [ ] TypeScript types are correctly used throughout

## 10. Additional Notes

### AI Model Selection
- **Budget Model**: Use budget-friendly model (e.g., GPT-3.5-turbo) per tech stack
- **Model Configuration**: Consider model parameters (temperature, max_tokens) for consistent output
- **Response Format**: Request JSON format if supported by model

### Prompt Engineering
- **System Prompt**: Clearly define flashcard format and constraints
- **Character Limits**: Include character limits in prompt (front <= 200, back <= 500)
- **Proposal Count**: Request up to 5 proposals
- **Language**: Specify English-only if applicable

### Privacy and Data Handling
- **No Storage**: Raw source text is never stored in database or analytics
- **No Logging**: Raw source text is never logged in server logs
- **Analytics**: Only track that generation occurred, not the content

### Retry Strategy
- **Invalid JSON**: Retry up to 2 times if AI returns invalid JSON
- **Network Errors**: Consider retry with exponential backoff
- **Rate Limits**: Do not retry on rate limit errors

### Cost Management
- **Input Limit**: 10,000 character limit helps control input costs
- **Output Limit**: Up to 5 proposals limits output costs
- **Budget Model**: Using budget-friendly model reduces per-request costs
- **Monitoring**: Monitor OpenRouter usage and costs

### Future Enhancements
- Async processing for long-running generations
- Caching for identical input text
- Support for multiple languages
- Customizable proposal count
- Model selection by user preference

