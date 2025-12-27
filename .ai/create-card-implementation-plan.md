# API Endpoint Implementation Plan: Create Card (POST /api/cards)

## 1. Endpoint Overview

The Create Card endpoint allows users to manually create a new flashcard. The endpoint automatically sets the `origin` field to `'manual'` and creates an analytics event `manual_create` to track the action. The card is persisted to the database with the authenticated user's ID.

**Purpose**: Enable users to create flashcards manually through the application interface.

**Business Value**: Supports the core flashcard creation functionality, allowing users to build their card collection without AI assistance.

## 2. Request Details

- **HTTP Method**: `POST`
- **URL Structure**: `/api/cards`
- **Parameters**: None
- **Request Headers**:
  - `Authorization: Bearer <supabase_jwt_token>` (required)
  - `Content-Type: application/json` (required)
- **Request Body**:
```json
{
  "front": "string",
  "back": "string"
}
```

## 3. Used Types

### Request Types
- `CreateCardCommand` (from `src/types.ts`):
  ```typescript
  {
    front: string;
    back: string;
  }
  ```

### Response Types
- `CreateCardResponse` (from `src/types.ts`), which is `CardDTO`:
  ```typescript
  {
    id: string;
    front: string;
    back: string;
    origin: "manual";
    created_at: string;
    updated_at: string;
  }
  ```

### Error Response Type
- `ErrorResponse` (from `src/types.ts`)

## 4. Response Details

### Success Response (201 Created)
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
    "message": "Validation error",
    "details": {
      "front": "Front must be between 1 and 200 characters",
      "back": "Back must be between 1 and 500 characters"
    }
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

## 5. Data Flow

1. **Request Reception**: Astro API route handler receives POST request at `/api/cards`
2. **Authentication**: Extract and validate JWT token from `Authorization` header
3. **User Identification**: Extract `user_id` from validated JWT token claims
4. **Request Body Validation**: Parse and validate JSON body using Zod schema:
   - `front`: Required, non-empty string, max 200 characters
   - `back`: Required, non-empty string, max 500 characters
5. **Service Layer Call**: Call `CardService.createCard(command, userId)`
6. **Database Insert**: Service constructs Supabase insert:
   - Set `user_id` from authenticated user
   - Set `origin = 'manual'`
   - Set `front` and `back` from validated input
   - Database generates `id` (UUID) and timestamps (`created_at`, `updated_at`)
7. **Analytics Event Creation**: Service creates analytics event:
   - `event_type = 'manual_create'`
   - `origin = 'manual'`
   - `context = {}` or `{"card_id": cardId}` (optional)
8. **Data Transformation**: Service maps database row to `CardDTO` format
9. **Response Construction**: Build `CreateCardResponse` with created card
10. **Response Return**: Return JSON response with `201 Created` status

### Database Interaction Details

- **Table**: `cards`
- **RLS Policy**: `cards_insert_own` enforces `auth.uid() = user_id`
- **Insert Pattern**:
  ```typescript
  const { data, error } = await supabase
    .from('cards')
    .insert({
      user_id: userId,
      front: command.front,
      back: command.back,
      origin: 'manual'
    })
    .select('id, front, back, origin, created_at, updated_at')
    .single();
  ```

### Analytics Event Creation

- **Table**: `analytics_events`
- **Insert Pattern**:
  ```typescript
  await supabase
    .from('analytics_events')
    .insert({
      user_id: userId,
      event_type: 'manual_create',
      origin: 'manual',
      context: { card_id: card.id } // optional
    });
  ```

## 6. Security Considerations

### Authentication
- **JWT Token Validation**: Extract and validate Supabase JWT token from `Authorization` header
- **Token Format**: Must be `Bearer <token>`
- **Validation Method**: Use Supabase client's `auth.getUser()` or verify token
- **Failure Handling**: Return `401 Unauthorized` if token is missing, invalid, or expired

### Authorization
- **Row Level Security (RLS)**: Primary authorization mechanism enforced at database level
- **RLS Policy**: `cards_insert_own` ensures users can only create cards for themselves
- **User ID Enforcement**: Set `user_id` from JWT token (never trust client-provided `user_id`)
- **Trigger Protection**: Optional database trigger `set_user_id_from_auth` provides additional security layer

### Input Validation
- **Character Limits**: Enforce `front <= 200` and `back <= 500` characters (both client and server-side)
- **Required Fields**: Validate `front` and `back` are non-empty strings
- **Data Types**: Validate string types
- **XSS Prevention**: Sanitize HTML/JavaScript in `front` and `back` fields before storage
- **SQL Injection Prevention**: Supabase client uses parameterized queries automatically

### Data Exposure
- **DTO Filtering**: Exclude sensitive fields (`user_id`, `deleted_at`) from response
- **Error Messages**: Provide clear validation error messages without exposing internal details

## 7. Error Handling

### Error Scenarios and Status Codes

#### 1. Authentication Errors (401 Unauthorized)
- **Scenario**: Missing `Authorization` header
- **Scenario**: Invalid JWT token format
- **Scenario**: Expired JWT token
- **Handling**: Return `401` with `AUTHENTICATION_ERROR` code
- **Logging**: Log authentication failures (without exposing token details)

#### 2. Validation Errors (400 Bad Request)
- **Scenario**: Missing `front` or `back` field
- **Scenario**: `front` or `back` is empty string
- **Scenario**: `front` exceeds 200 characters
- **Scenario**: `back` exceeds 500 characters
- **Scenario**: Invalid JSON in request body
- **Scenario**: Invalid data types (non-string values)
- **Handling**: Return `400` with `VALIDATION_ERROR` code and detailed field-level error messages
- **Logging**: Log validation errors with field names (sanitize values)

#### 3. Database Errors (500 Internal Server Error)
- **Scenario**: Database connection failure
- **Scenario**: Insert operation failure
- **Scenario**: CHECK constraint violation (should be caught by validation, but handle gracefully)
- **Scenario**: Analytics event creation failure (log but don't fail card creation)
- **Handling**: Return `500` with `SERVER_ERROR` code
- **Logging**: Log full error details server-side (with error ID for correlation)
- **User Message**: Generic error message (do not expose internal details)

### Error Response Format
All errors follow the `ErrorResponse` type structure with optional `details` field for validation errors.

### Error Logging Strategy
- **Authentication Errors**: Log at WARN level with user identifier (if available)
- **Validation Errors**: Log at INFO level (expected user errors)
- **Database Errors**: Log at ERROR level with full stack trace and error ID
- **Analytics Errors**: Log at WARN level (non-critical, card creation should succeed)
- **Never Log**: JWT tokens, full card content in error logs

## 8. Performance Considerations

### Database Optimization
- **Index Utilization**: No indexes needed for insert operations (primary key is auto-generated)
- **Transaction Consideration**: Card creation and analytics event creation should be atomic (use transaction if needed)
- **RLS Overhead**: RLS policies add minimal overhead but ensure security

### Query Performance
- **Single Insert**: Efficient single row insert operation
- **Analytics Event**: Lightweight insert operation

### Potential Bottlenecks
- **None Identified**: Simple insert operations are highly optimized

### Caching Considerations
- **Invalidation**: Invalidate any cached card lists after card creation
- **Future**: Consider caching user's total card count (invalidate on create)

## 9. Implementation Steps

### Step 1: Create Validation Schema
1. Create or update `src/lib/validations/cards.ts`:
   - Define Zod schema for `CreateCardCommand`:
     ```typescript
     const createCardSchema = z.object({
       front: z.string().min(1, "Front cannot be empty").max(200, "Front must be 200 characters or less"),
       back: z.string().min(1, "Back cannot be empty").max(500, "Back must be 500 characters or less"),
     });
     ```

### Step 2: Create Analytics Service (if needed)
1. Create `src/lib/services/analytics.service.ts`:
   - Function `trackEvent(userId, eventType, origin, context)`: Creates analytics event
   - Handle errors gracefully (don't fail card creation if analytics fails)

### Step 3: Update Card Service
1. Update `src/lib/services/card.service.ts`:
   - Function `createCard(command: CreateCardCommand, userId: string)`: 
     - Parameters: `command` (validated), `userId` (from JWT)
     - Constructs Supabase insert with `user_id` and `origin = 'manual'`
     - Inserts card into database
     - Creates analytics event `manual_create` (non-blocking, log errors)
     - Returns `CardDTO`
     - Handle database errors and transform to service-level errors
     - Map database row to `CardDTO` (exclude `user_id` and `deleted_at`)

### Step 4: Create API Route Handler
1. Create `src/pages/api/cards/index.ts`:
   - Export `export const prerender = false;` (required for API routes)
   - Implement `POST` handler:
     - Extract and validate authentication
     - Parse and validate request body using Zod schema
     - Call `CardService.createCard(command, userId)`
     - Return JSON response with `201 Created` status
   - Implement error handling:
     - Catch authentication errors → return `401`
     - Catch validation errors → return `400` with field-level details
     - Catch service/database errors → return `500`
     - Use consistent `ErrorResponse` format

### Step 5: Error Handling
1. Update `src/lib/errors/api-errors.ts`:
   - Ensure `createValidationError()` supports field-level error details
   - Update `handleApiError()` to handle validation errors with details

### Step 6: Type Safety
1. Ensure `CreateCardCommand` and `CreateCardResponse` types are correctly imported from `src/types.ts`
2. Verify database types from `src/db/database.types.ts` match expected structure

### Step 7: Testing Considerations
1. **Unit Tests** (future):
   - Test validation schema (all edge cases)
   - Test DTO mapping
   - Test error scenarios
2. **Integration Tests** (future):
   - Test authentication flow
   - Test database insert with RLS
   - Test analytics event creation
   - Test validation error scenarios
   - Test character limit enforcement

### Step 8: Code Review Checklist
- [ ] Authentication is properly validated
- [ ] Request body is validated with Zod (all fields, character limits)
- [ ] RLS policies are respected
- [ ] `user_id` is set from JWT token (never from client)
- [ ] `origin` is automatically set to `'manual'`
- [ ] Analytics event is created (non-blocking)
- [ ] Error responses follow `ErrorResponse` format
- [ ] Sensitive fields (`user_id`, `deleted_at`) are excluded from response
- [ ] Input sanitization prevents XSS
- [ ] TypeScript types are correctly used throughout

## 10. Additional Notes

### Service Layer Pattern
The service layer (`CardService.createCard`) abstracts database operations from the API route handler, providing:
- Reusability across different endpoints
- Easier testing (mock service in tests)
- Centralized business logic
- Consistent error handling

### Analytics Event Creation
- Analytics event creation should be non-blocking
- If analytics event creation fails, log the error but don't fail card creation
- Consider using a queue or background job for analytics in the future (post-MVP)

### Character Limit Enforcement
- Character limits are enforced at multiple layers:
  1. Client-side validation (user experience)
  2. Server-side Zod validation (API security)
  3. Database CHECK constraints (data integrity)
- All three layers should be consistent

### Transaction Consideration
- Card creation and analytics event creation could be wrapped in a transaction
- For MVP, analytics failure should not block card creation
- Consider transaction for post-MVP if analytics becomes critical

### Origin Field
- `origin` field is automatically set to `'manual'` for this endpoint
- This is different from `/api/cards/accept` which sets `origin = 'ai'`
- Users cannot override the `origin` field

