# REST API Plan - Lang Memo

## 1. Resources

### 1.1 Cards
- **Database Table**: `cards`
- **Description**: Flashcard entities created by users, supporting both AI-generated and manually created cards
- **Key Fields**: `id`, `user_id`, `front`, `back`, `origin`, `created_at`, `updated_at`, `deleted_at`

### 1.2 Analytics Events
- **Database Table**: `analytics_events`
- **Description**: Analytics events for measuring KPIs and user behavior
- **Key Fields**: `id`, `user_id`, `event_type`, `origin`, `context`, `created_at`

### 1.3 AI Generation
- **Description**: Server-side AI flashcard generation endpoint (no database table, business logic endpoint)
- **Purpose**: Generate card proposals from pasted text using OpenRouter

## 2. Endpoints

### 2.1 Cards Resource

#### 2.1.1 List Cards
- **HTTP Method**: `GET`
- **URL Path**: `/api/cards`
- **Description**: Retrieve all active (non-deleted) cards for the authenticated user, ordered by creation date (newest first)
- **Query Parameters**:
  - `page` (optional, integer, default: 1): Page number for pagination
  - `limit` (optional, integer, default: 50, max: 100): Number of cards per page
  - `include_deleted` (optional, boolean, default: false): Include soft-deleted cards (for admin/analytics use)
- **Request Headers**:
  - `Authorization: Bearer <supabase_jwt_token>` (required)
- **Request Payload**: None
- **Response Payload**:
```json
{
  "data": [
    {
      "id": "uuid",
      "front": "string",
      "back": "string",
      "origin": "ai" | "manual",
      "created_at": "ISO 8601 timestamp",
      "updated_at": "ISO 8601 timestamp"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "total_pages": 2
  }
}
```
- **Success Codes**:
  - `200 OK`: Cards retrieved successfully
- **Error Codes**:
  - `401 Unauthorized`: Missing or invalid authentication token
  - `500 Internal Server Error`: Database or server error

#### 2.1.2 Get Single Card
- **HTTP Method**: `GET`
- **URL Path**: `/api/cards/:id`
- **Description**: Retrieve a specific card by ID (only if owned by authenticated user and not deleted)
- **Path Parameters**:
  - `id` (required, UUID): Card identifier
- **Request Headers**:
  - `Authorization: Bearer <supabase_jwt_token>` (required)
- **Request Payload**: None
- **Response Payload**:
```json
{
  "id": "uuid",
  "front": "string",
  "back": "string",
  "origin": "ai" | "manual",
  "created_at": "ISO 8601 timestamp",
  "updated_at": "ISO 8601 timestamp"
}
```
- **Success Codes**:
  - `200 OK`: Card retrieved successfully
- **Error Codes**:
  - `401 Unauthorized`: Missing or invalid authentication token
  - `404 Not Found`: Card not found or not owned by user
  - `500 Internal Server Error`: Database or server error

#### 2.1.3 Create Card (Manual)
- **HTTP Method**: `POST`
- **URL Path**: `/api/cards`
- **Description**: Create a new card manually. Sets `origin` to `'manual'` automatically. Creates analytics event `manual_create`.
- **Request Headers**:
  - `Authorization: Bearer <supabase_jwt_token>` (required)
  - `Content-Type: application/json`
- **Request Payload**:
```json
{
  "front": "string",
  "back": "string"
}
```
- **Response Payload**:
```json
{
  "id": "uuid",
  "front": "string",
  "back": "string",
  "origin": "manual",
  "created_at": "ISO 8601 timestamp",
  "updated_at": "ISO 8601 timestamp"
}
```
- **Success Codes**:
  - `201 Created`: Card created successfully
- **Error Codes**:
  - `400 Bad Request`: Validation error (character limits exceeded, missing required fields, invalid data types)
  - `401 Unauthorized`: Missing or invalid authentication token
  - `500 Internal Server Error`: Database or server error

#### 2.1.4 Accept Proposal (Create from AI Proposal)
- **HTTP Method**: `POST`
- **URL Path**: `/api/cards/accept`
- **Description**: Accept an AI-generated proposal and persist it as a card. Sets `origin` to `'ai'` automatically. Creates analytics event `accept`. This endpoint is used when user accepts a proposal after optional editing.
- **Request Headers**:
  - `Authorization: Bearer <supabase_jwt_token>` (required)
  - `Content-Type: application/json`
- **Request Payload**:
```json
{
  "front": "string",
  "back": "string"
}
```
- **Response Payload**:
```json
{
  "id": "uuid",
  "front": "string",
  "back": "string",
  "origin": "ai",
  "created_at": "ISO 8601 timestamp",
  "updated_at": "ISO 8601 timestamp"
}
```
- **Success Codes**:
  - `201 Created`: Card accepted and persisted successfully
- **Error Codes**:
  - `400 Bad Request`: Validation error (character limits exceeded, missing required fields, invalid data types)
  - `401 Unauthorized`: Missing or invalid authentication token
  - `500 Internal Server Error`: Database or server error

#### 2.1.5 Update Card
- **HTTP Method**: `PATCH`
- **URL Path**: `/api/cards/:id`
- **Description**: Update an existing card's front and/or back. Only active (non-deleted) cards can be updated. The `updated_at` timestamp is automatically updated by database trigger.
- **Path Parameters**:
  - `id` (required, UUID): Card identifier
- **Request Headers**:
  - `Authorization: Bearer <supabase_jwt_token>` (required)
  - `Content-Type: application/json`
- **Request Payload**:
```json
{
  "front": "string" (optional),
  "back": "string" (optional)
}
```
- **Response Payload**:
```json
{
  "id": "uuid",
  "front": "string",
  "back": "string",
  "origin": "ai" | "manual",
  "created_at": "ISO 8601 timestamp",
  "updated_at": "ISO 8601 timestamp"
}
```
- **Success Codes**:
  - `200 OK`: Card updated successfully
- **Error Codes**:
  - `400 Bad Request`: Validation error (character limits exceeded, invalid data types)
  - `401 Unauthorized`: Missing or invalid authentication token
  - `404 Not Found`: Card not found, not owned by user, or already deleted
  - `500 Internal Server Error`: Database or server error

#### 2.1.6 Delete Card (Soft Delete)
- **HTTP Method**: `DELETE`
- **URL Path**: `/api/cards/:id`
- **Description**: Soft delete a card by setting `deleted_at` timestamp. The card is not permanently removed but is excluded from normal queries. Only active cards can be deleted.
- **Path Parameters**:
  - `id` (required, UUID): Card identifier
- **Request Headers**:
  - `Authorization: Bearer <supabase_jwt_token>` (required)
- **Request Payload**: None
- **Response Payload**:
```json
{
  "message": "Card deleted successfully"
}
```
- **Success Codes**:
  - `200 OK`: Card soft-deleted successfully
- **Error Codes**:
  - `401 Unauthorized`: Missing or invalid authentication token
  - `404 Not Found`: Card not found, not owned by user, or already deleted
  - `500 Internal Server Error`: Database or server error

#### 2.1.7 Get Cards for Practice
- **HTTP Method**: `GET`
- **URL Path**: `/api/cards/practice`
- **Description**: Retrieve all active cards for practice mode. Cards are returned in a deterministic order; client-side shuffling is recommended to avoid expensive database `ORDER BY RANDOM()`. This endpoint supports the practice mode feature.
- **Query Parameters**:
  - `limit` (optional, integer, default: all cards): Maximum number of cards to return (for large collections)
- **Request Headers**:
  - `Authorization: Bearer <supabase_jwt_token>` (required)
- **Request Payload**: None
- **Response Payload**:
```json
{
  "data": [
    {
      "id": "uuid",
      "front": "string",
      "back": "string",
      "origin": "ai" | "manual",
      "created_at": "ISO 8601 timestamp",
      "updated_at": "ISO 8601 timestamp"
    }
  ],
  "count": 10
}
```
- **Success Codes**:
  - `200 OK`: Cards retrieved successfully
- **Error Codes**:
  - `401 Unauthorized`: Missing or invalid authentication token
  - `500 Internal Server Error`: Database or server error

### 2.2 AI Generation Resource

#### 2.2.1 Generate Card Proposals
- **HTTP Method**: `POST`
- **URL Path**: `/api/cards/generate`
- **Description**: Generate AI flashcard proposals from pasted English text using OpenRouter. Validates input length, calls AI model, validates output schema and character limits, and creates analytics event `generate`. Does not persist any cards; proposals must be accepted via `/api/cards/accept` endpoint.
- **Request Headers**:
  - `Authorization: Bearer <supabase_jwt_token>` (required)
  - `Content-Type: application/json`
- **Request Payload**:
```json
{
  "text": "string"
}
```
- **Response Payload**:
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
- **Success Codes**:
  - `200 OK`: Proposals generated successfully
- **Error Codes**:
  - `400 Bad Request`: Input text exceeds 10,000 character limit, empty text, or invalid JSON
  - `401 Unauthorized`: Missing or invalid authentication token
  - `402 Payment Required`: OpenRouter quota/rate limit exceeded (user or org daily cap)
  - `422 Unprocessable Entity`: AI model returned invalid JSON or proposals exceeding character limits (after retry attempts)
  - `429 Too Many Requests`: Rate limit exceeded (temporary, retry after delay)
  - `500 Internal Server Error`: OpenRouter API error, network error, or server error
  - `503 Service Unavailable`: AI service temporarily unavailable

**Business Logic Notes**:
- Input validation: Reject if `text` length > 10,000 characters
- AI call: Use OpenRouter with budget model, request up to 5 proposals
- Output validation: Validate JSON schema `{ front: string, back: string }[]`, validate each proposal's `front <= 200` and `back <= 500` characters
- Error handling: If AI returns invalid JSON, attempt retry (up to 2 retries) or return 422 with user-friendly error
- Analytics: Create `generate` event with `event_type='generate'`, `origin=null`, `context={}` (no raw source text stored)
- Privacy: Do not log or store raw source text in server logs or analytics

### 2.3 Analytics Resource

#### 2.3.1 Track Analytics Event
- **HTTP Method**: `POST`
- **URL Path**: `/api/analytics/events`
- **Description**: Create an analytics event. This endpoint is primarily called by the application to track user actions. Events are automatically created by other endpoints (e.g., `accept`, `manual_create`, `practice_done`), but this endpoint allows explicit event tracking when needed (e.g., client-side `reject` actions).
- **Request Headers**:
  - `Authorization: Bearer <supabase_jwt_token>` (required)
  - `Content-Type: application/json`
- **Request Payload**:
```json
{
  "event_type": "generate" | "accept" | "reject" | "manual_create" | "practice_done",
  "origin": "ai" | "manual" | null,
  "context": {} | {
    "card_id": "uuid" (optional, for accept/manual_create),
    "card_count": number (required for practice_done),
    "correct_count": number (required for practice_done)
  }
}
```
- **Response Payload**:
```json
{
  "id": "uuid",
  "event_type": "string",
  "origin": "ai" | "manual" | null,
  "context": {},
  "created_at": "ISO 8601 timestamp"
}
```
- **Success Codes**:
  - `201 Created`: Event created successfully
- **Error Codes**:
  - `400 Bad Request`: Invalid `event_type`, invalid `origin` for event type, missing required context fields, or invalid data types
  - `401 Unauthorized`: Missing or invalid authentication token
  - `500 Internal Server Error`: Database or server error

**Business Logic Notes**:
- Validation: `event_type` must be one of the allowed values
- Validation: `origin` must be `'ai'` or `'manual'` for `accept` and `manual_create` events, `null` for `generate` and `reject` events, and `null` or `'ai'`/`'manual'` for `practice_done` events
- Validation: For `practice_done` events, `context` must include `card_count` and `correct_count` as numbers
- Privacy: Never include raw source text in `context` or any other field

#### 2.3.2 Track Practice Session Completion
- **HTTP Method**: `POST`
- **URL Path**: `/api/analytics/practice-done`
- **Description**: Convenience endpoint to track practice session completion. Creates analytics event `practice_done` with session statistics. This endpoint is called when a practice session ends.
- **Request Headers**:
  - `Authorization: Bearer <supabase_jwt_token>` (required)
  - `Content-Type: application/json`
- **Request Payload**:
```json
{
  "card_count": 10,
  "correct_count": 8
}
```
- **Response Payload**:
```json
{
  "id": "uuid",
  "event_type": "practice_done",
  "origin": null,
  "context": {
    "card_count": 10,
    "correct_count": 8
  },
  "created_at": "ISO 8601 timestamp"
}
```
- **Success Codes**:
  - `201 Created`: Practice session event created successfully
- **Error Codes**:
  - `400 Bad Request`: Missing required fields, invalid data types, or negative numbers
  - `401 Unauthorized`: Missing or invalid authentication token
  - `500 Internal Server Error`: Database or server error

## 3. Authentication and Authorization

### 3.1 Authentication Mechanism

**Provider**: Supabase Auth

**Method**: Email/password authentication with email verification

**Implementation Details**:
- Authentication is handled by Supabase Auth service (not part of this API)
- API endpoints require a valid Supabase JWT token in the `Authorization` header
- Token format: `Bearer <supabase_jwt_token>`
- Token validation: Verify token signature and expiration using Supabase's public key
- User identification: Extract `user_id` from token claims (`auth.uid()`)

**Authentication Endpoints** (handled by Supabase, not part of this API):
- Sign up: `POST /auth/v1/signup` (Supabase endpoint)
- Sign in: `POST /auth/v1/token` (Supabase endpoint)
- Sign out: `POST /auth/v1/logout` (Supabase endpoint)
- Email verification: Handled via Supabase email confirmation links
- Password reset: `POST /auth/v1/recover` (Supabase endpoint)

### 3.2 Authorization

**Row Level Security (RLS)**:
- All database tables (`cards`, `analytics_events`) have RLS enabled
- RLS policies enforce that users can only access their own data
- Policies use `auth.uid() = user_id` pattern to restrict access
- API endpoints rely on RLS as the primary authorization mechanism

**API-Level Authorization**:
- All endpoints (except authentication endpoints handled by Supabase) require authentication
- User ID is extracted from JWT token and used for:
  - Setting `user_id` on card creation (prevents setting other users' IDs)
  - Filtering queries to user's own data (RLS handles this, but API should also filter for clarity)
  - Creating analytics events with correct `user_id`

**Authorization Rules**:
- Users can only create, read, update, and delete their own cards
- Users can only create analytics events for themselves
- Soft-deleted cards are excluded from normal queries (RLS policy filters `deleted_at IS NULL`)
- Attempts to access other users' data return `404 Not Found` (not `403 Forbidden`) to prevent information leakage

### 3.3 Security Considerations

**Input Sanitization**:
- Sanitize all user input to prevent XSS attacks
- Escape HTML/JavaScript in card `front` and `back` fields before storage
- Validate and sanitize JSON payloads

**SQL Injection Prevention**:
- Use parameterized queries (Supabase client handles this automatically)
- Never construct SQL queries with string concatenation

**Rate Limiting**:
- Implement rate limiting on AI generation endpoint (`/api/cards/generate`) to prevent abuse
- Consider rate limiting on card creation endpoints to prevent spam
- Rate limits should be per-user and per-IP address

**Privacy**:
- Never log or store raw source text from generation requests
- Exclude raw source text from analytics events
- Redact sensitive information from error logs

## 4. Validation and Business Logic

### 4.1 Card Validation

**Character Limits** (enforced both client-side and server-side):
- `front`: Maximum 200 characters (CHECK constraint: `char_length(front) <= 200`)
- `back`: Maximum 500 characters (CHECK constraint: `char_length(back) <= 500`)

**Required Fields**:
- `front`: Required, non-empty string
- `back`: Required, non-empty string

**Data Types**:
- `front`: String (TEXT)
- `back`: String (TEXT)

**Origin Field**:
- Automatically set by API:
  - `origin = 'ai'` for cards created via `/api/cards/accept` endpoint
  - `origin = 'manual'` for cards created via `/api/cards` endpoint
- Not user-provided; validated against CHECK constraint: `origin IN ('ai', 'manual')`

**Soft Delete**:
- Cards are soft-deleted (not permanently removed)
- Soft delete sets `deleted_at` timestamp
- Soft-deleted cards are excluded from normal queries (RLS policy filters `deleted_at IS NULL`)
- Soft-deleted cards cannot be updated or deleted again

### 4.2 AI Generation Validation

**Input Validation**:
- `text`: Required, non-empty string
- Maximum length: 10,000 characters (reject with `400 Bad Request` if exceeded)
- Language: English-only (validation at application level, not enforced by API)

**Output Validation**:
- JSON schema: Array of objects `{ front: string, back: string }`
- Maximum proposals: 5 per generation request (enforced by AI prompt/configuration)
- Each proposal must satisfy:
  - `front`: Maximum 200 characters
  - `back`: Maximum 500 characters
- Invalid proposals are filtered out or generation fails with `422 Unprocessable Entity`

**Error Handling**:
- If AI returns invalid JSON: Attempt retry (up to 2 retries), then return `422` with user-friendly error
- If AI returns proposals exceeding character limits: Filter invalid proposals or return `422`
- If OpenRouter quota/rate limit exceeded: Return `402 Payment Required` or `429 Too Many Requests`

### 4.3 Analytics Event Validation

**Event Type Validation**:
- `event_type`: Required, must be one of: `'generate'`, `'accept'`, `'reject'`, `'manual_create'`, `'practice_done'`
- CHECK constraint: `event_type IN ('generate', 'accept', 'reject', 'manual_create', 'practice_done')`

**Origin Validation**:
- `origin`: Optional, must be `'ai'`, `'manual'`, or `null`
- CHECK constraint: `origin IN ('ai', 'manual') OR origin IS NULL`
- Business rules:
  - `generate` events: `origin = null`
  - `accept` events: `origin = 'ai'` (accepted proposals are AI-generated)
  - `reject` events: `origin = null` (no card created)
  - `manual_create` events: `origin = 'manual'`
  - `practice_done` events: `origin = null` (practice applies to all cards)

**Context Validation**:
- `context`: Optional JSONB field
- Structure depends on `event_type`:
  - `generate`: `{}` (empty or minimal metadata)
  - `accept`: `{}` or `{"card_id": "uuid"}` (optional)
  - `reject`: `{}` (empty)
  - `manual_create`: `{}` or `{"card_id": "uuid"}` (optional)
  - `practice_done`: `{"card_count": number, "correct_count": number}` (required fields)

**Privacy Validation**:
- Never include raw source text in `context` or any field
- Never log raw source text in server logs

### 4.4 Business Logic Implementation

**Card Creation Flow**:
1. User creates card manually or accepts AI proposal
2. API validates input (character limits, required fields)
3. API sets `origin` automatically (`'manual'` or `'ai'`)
4. API sets `user_id` from JWT token (RLS trigger may also enforce this)
5. Database generates `id` (UUID) and timestamps (`created_at`, `updated_at`)
6. Card is persisted to database
7. Analytics event is created (`manual_create` or `accept`)

**AI Generation Flow**:
1. User submits text for generation
2. API validates input (length <= 10,000 characters)
3. API calls OpenRouter with text and generation parameters
4. API validates AI response (JSON schema, character limits)
5. If validation fails: Retry (up to 2 times) or return error
6. API filters invalid proposals (exceeding character limits)
7. Analytics event `generate` is created (no raw source text stored)
8. Valid proposals are returned to client (not persisted)

**Proposal Acceptance Flow**:
1. User edits proposal (client-side, no API call)
2. User clicks Accept
3. Client validates proposal (character limits)
4. Client calls `/api/cards/accept` with `front` and `back`
5. API validates input (character limits, required fields)
6. API creates card with `origin = 'ai'`
7. Analytics event `accept` is created with `origin = 'ai'`
8. Card is returned to client

**Proposal Rejection Flow**:
1. User clicks Reject (client-side action)
2. Proposal is removed from client-side list (no API call for rejection)
3. Optional: Client calls `/api/analytics/events` to track `reject` event
4. No card is persisted

**Practice Session Flow**:
1. User starts practice session
2. Client calls `/api/cards/practice` to fetch all active cards
3. Client shuffles cards (application-level, not database-level)
4. User practices cards (client-side state management)
5. When session ends, client calls `/api/analytics/practice-done` with statistics
6. Analytics event `practice_done` is created with `card_count` and `correct_count`

**Soft Delete Flow**:
1. User deletes a card
2. API sets `deleted_at = now()` (UPDATE operation, not DELETE)
3. Card is excluded from future queries (RLS policy filters `deleted_at IS NULL`)
4. Card can be recovered by setting `deleted_at = NULL` (not exposed in MVP API)

**Update Flow**:
1. User updates a card
2. API validates input (character limits)
3. API updates `front` and/or `back` fields
4. Database trigger automatically updates `updated_at` timestamp
5. Updated card is returned to client

### 4.5 Pagination and Sorting

**List Cards Endpoint** (`GET /api/cards`):
- Default pagination: `page=1`, `limit=50`
- Maximum limit: 100 cards per page
- Sorting: By `created_at DESC` (newest first) - optimized by index `idx_cards_user_id_created_at`
- Response includes pagination metadata: `page`, `limit`, `total`, `total_pages`

**Practice Cards Endpoint** (`GET /api/cards/practice`):
- No pagination by default (returns all active cards)
- Optional `limit` parameter for large collections
- Sorting: By `created_at DESC` (deterministic order for client-side shuffling)
- Client-side shuffling recommended to avoid expensive `ORDER BY RANDOM()`

### 4.6 Error Handling

**Validation Errors** (`400 Bad Request`):
- Missing required fields
- Character limits exceeded
- Invalid data types
- Invalid enum values (`origin`, `event_type`)

**Authentication Errors** (`401 Unauthorized`):
- Missing `Authorization` header
- Invalid or expired JWT token
- Token signature verification failure

**Not Found Errors** (`404 Not Found`):
- Card not found
- Card not owned by user (authorization failure, but returns 404 to prevent information leakage)
- Card already soft-deleted

**Business Logic Errors**:
- `402 Payment Required`: OpenRouter quota exceeded (user or org daily cap)
- `422 Unprocessable Entity`: AI returned invalid JSON or proposals exceeding limits (after retries)
- `429 Too Many Requests`: Rate limit exceeded (temporary, retry after delay)
- `503 Service Unavailable`: AI service temporarily unavailable

**Server Errors** (`500 Internal Server Error`):
- Database connection errors
- Unexpected server errors
- Should include error ID for logging (but not expose internal details to client)

**Error Response Format**:
```json
{
  "error": {
    "code": "VALIDATION_ERROR" | "AUTHENTICATION_ERROR" | "NOT_FOUND" | "QUOTA_EXCEEDED" | "SERVER_ERROR",
    "message": "User-friendly error message",
    "details": {} (optional, additional error context)
  }
}
```

### 4.7 Performance Considerations

**Database Indexes**:
- `idx_cards_user_id_created_at`: Optimizes chronological card retrieval
- `idx_cards_user_id`: Optimizes user filtering
- `idx_analytics_events_created_at`: Optimizes 90-day retention cleanup
- `idx_analytics_events_user_id`: Optimizes user event filtering

**Query Optimization**:
- Always filter by `user_id` and `deleted_at IS NULL` for active cards
- Use pagination for large result sets
- Avoid `ORDER BY RANDOM()` in practice endpoint (use client-side shuffling)

**Caching** (future consideration):
- Consider caching user's card count for empty state checks
- Consider caching practice cards list (with short TTL)

**Connection Pooling**:
- Use Supabase connection pooling for production workloads
- Monitor connection pool usage and adjust as needed

### 4.8 Analytics Retention

**90-Day Retention Policy**:
- Analytics events older than 90 days should be deleted via scheduled job
- Implementation: Supabase Edge Function or pg_cron
- Cleanup query: `DELETE FROM analytics_events WHERE created_at < NOW() - INTERVAL '90 days'`
- Index `idx_analytics_events_created_at` supports efficient cleanup queries

