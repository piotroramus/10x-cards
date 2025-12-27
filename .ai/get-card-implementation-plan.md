# API Endpoint Implementation Plan: Get Single Card (GET /api/cards/:id)

## 1. Endpoint Overview

The Get Single Card endpoint retrieves a specific card by ID for the authenticated user. The card must be owned by the user and not soft-deleted (unless explicitly allowed). The endpoint relies on Supabase Row Level Security (RLS) policies to ensure users can only access their own cards.

**Purpose**: Retrieve a single flashcard by its unique identifier for viewing or editing purposes.

**Business Value**: Enables users to view individual card details, supporting card editing and detail views in the application.

## 2. Request Details

- **HTTP Method**: `GET`
- **URL Structure**: `/api/cards/:id`
- **Parameters**:
  - **Required**:
    - `id` (UUID, path parameter): Card identifier
  - **Optional**: None
- **Request Headers**:
  - `Authorization: Bearer <supabase_jwt_token>` (required)
- **Request Body**: None

## 3. Used Types

### Request Types
- Path parameter `id` is validated as UUID using Zod schema

### Response Types
- `GetCardResponse` (from `src/types.ts`), which is `CardDTO`:
  ```typescript
  {
    id: string;
    front: string;
    back: string;
    origin: "ai" | "manual";
    created_at: string;
    updated_at: string;
  }
  ```

### Error Response Type
- `ErrorResponse` (from `src/types.ts`)

## 4. Response Details

### Success Response (200 OK)
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

#### 404 Not Found
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Card not found or not owned by user"
  }
}
```

#### 400 Bad Request (Invalid UUID)
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid card ID format"
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

1. **Request Reception**: Astro API route handler receives GET request at `/api/cards/:id`
2. **Authentication**: Extract and validate JWT token from `Authorization` header
3. **User Identification**: Extract `user_id` from validated JWT token claims
4. **Path Parameter Validation**: Validate `id` parameter as UUID using Zod schema
5. **Service Layer Call**: Call `CardService.getCardById(id, userId)`
6. **Database Query**: Service constructs Supabase query:
   - Filter by `id` and `user_id` (RLS also enforces this)
   - Filter by `deleted_at IS NULL` (only active cards)
   - Select specific columns: `id, front, back, origin, created_at, updated_at`
7. **Data Transformation**: Service maps database row to `CardDTO` format (excludes `user_id` and `deleted_at`)
8. **Response Construction**: Return `CardDTO` or throw `NotFoundError` if card doesn't exist
9. **Response Return**: Return JSON response with `200 OK` status or appropriate error

### Database Interaction Details

- **Table**: `cards`
- **RLS Policy**: `cards_select_own` enforces `auth.uid() = user_id AND deleted_at IS NULL`
- **Query Pattern**:
  ```typescript
  const { data, error } = await supabase
    .from('cards')
    .select('id, front, back, origin, created_at, updated_at')
    .eq('id', cardId)
    .eq('user_id', userId)
    .is('deleted_at', null)
    .single();
  ```

## 6. Security Considerations

### Authentication
- **JWT Token Validation**: Extract and validate Supabase JWT token from `Authorization` header
- **Token Format**: Must be `Bearer <token>`
- **Validation Method**: Use Supabase client's `auth.getUser()` or verify token
- **Failure Handling**: Return `401 Unauthorized` if token is missing, invalid, or expired

### Authorization
- **Row Level Security (RLS)**: Primary authorization mechanism enforced at database level
- **RLS Policy**: `cards_select_own` ensures users can only access their own cards
- **API-Level Filtering**: Additionally filter by `user_id` in query for defense in depth
- **Soft Delete Protection**: Exclude soft-deleted cards from results
- **Information Leakage Prevention**: Return `404 Not Found` (not `403 Forbidden`) if card doesn't exist or isn't owned by user

### Input Validation
- **UUID Validation**: Validate `id` path parameter as valid UUID format using Zod
- **SQL Injection Prevention**: Supabase client uses parameterized queries automatically

### Data Exposure
- **DTO Filtering**: Exclude sensitive fields (`user_id`, `deleted_at`) from response
- **Error Messages**: Do not expose whether card exists but belongs to another user

## 7. Error Handling

### Error Scenarios and Status Codes

#### 1. Authentication Errors (401 Unauthorized)
- **Scenario**: Missing `Authorization` header
- **Scenario**: Invalid JWT token format
- **Scenario**: Expired JWT token
- **Scenario**: Token signature verification failure
- **Handling**: Return `401` with `AUTHENTICATION_ERROR` code
- **Logging**: Log authentication failures (without exposing token details)

#### 2. Validation Errors (400 Bad Request)
- **Scenario**: `id` parameter is not a valid UUID format
- **Handling**: Return `400` with `VALIDATION_ERROR` code
- **Logging**: Log validation errors with parameter values (sanitized)

#### 3. Not Found Errors (404 Not Found)
- **Scenario**: Card with given `id` does not exist
- **Scenario**: Card exists but is not owned by authenticated user
- **Scenario**: Card exists but is soft-deleted
- **Handling**: Return `404` with `NOT_FOUND` code
- **Logging**: Log at INFO level (expected user behavior)

#### 4. Database Errors (500 Internal Server Error)
- **Scenario**: Database connection failure
- **Scenario**: Query execution error
- **Scenario**: Unexpected database error
- **Handling**: Return `500` with `SERVER_ERROR` code
- **Logging**: Log full error details server-side (with error ID for correlation)
- **User Message**: Generic error message (do not expose internal details)

### Error Response Format
All errors follow the `ErrorResponse` type structure.

### Error Logging Strategy
- **Authentication Errors**: Log at WARN level with user identifier (if available)
- **Validation Errors**: Log at INFO level (expected user errors)
- **Not Found Errors**: Log at INFO level (expected user behavior)
- **Database Errors**: Log at ERROR level with full stack trace and error ID
- **Never Log**: JWT tokens, sensitive user data

## 8. Performance Considerations

### Database Optimization
- **Index Utilization**: Query uses primary key (`id`) for efficient lookup
- **RLS Overhead**: RLS policies add minimal overhead but ensure security
- **Select Specific Columns**: Only select required columns to reduce data transfer

### Query Performance
- **Single Row Query**: `.single()` method is efficient for single card retrieval
- **Soft Delete Filtering**: `deleted_at IS NULL` filter is efficient

### Potential Bottlenecks
- **None Identified**: Single row lookup by primary key is highly optimized

### Caching Opportunities (Future)
- Cache individual cards by ID (with short TTL, e.g., 30 seconds)
- Invalidate cache on card update/delete operations

## 9. Implementation Steps

### Step 1: Create Validation Schema
1. Create or update `src/lib/validations/cards.ts`:
   - Define Zod schema for UUID validation:
     ```typescript
     const cardIdSchema = z.string().uuid("Invalid card ID format");
     ```

### Step 2: Update Card Service
1. Update `src/lib/services/card.service.ts`:
   - Function `getCardById(cardId: string, userId: string)`: 
     - Parameters: `cardId` (UUID), `userId` (UUID)
     - Constructs Supabase query with RLS-aware filtering
     - Returns `CardDTO` or throws `NotFoundError`
     - Handle database errors and transform to service-level errors
     - Map database row to `CardDTO` (exclude `user_id` and `deleted_at`)

### Step 3: Create API Route Handler
1. Create `src/pages/api/cards/[id].ts`:
   - Export `export const prerender = false;` (required for API routes)
   - Implement `GET` handler:
     - Extract `id` from `context.params.id`
     - Extract and validate authentication
     - Validate `id` as UUID using Zod schema
     - Call `CardService.getCardById(id, userId)`
     - Return JSON response with `200 OK` status
   - Implement error handling:
     - Catch authentication errors → return `401`
     - Catch validation errors → return `400`
     - Catch `NotFoundError` → return `404`
     - Catch service/database errors → return `500`
     - Use consistent `ErrorResponse` format

### Step 4: Error Handling
1. Update `src/lib/errors/api-errors.ts`:
   - Add `createNotFoundError(message)` factory function
   - Update `handleApiError()` to handle `NotFoundError`

### Step 5: Type Safety
1. Ensure `CardDTO` and `GetCardResponse` types are correctly imported from `src/types.ts`
2. Verify database types from `src/db/database.types.ts` match expected structure

### Step 6: Testing Considerations
1. **Unit Tests** (future):
   - Test UUID validation
   - Test DTO mapping
   - Test error scenarios
2. **Integration Tests** (future):
   - Test authentication flow
   - Test database query with RLS
   - Test not found scenarios (non-existent, wrong user, soft-deleted)
   - Test error scenarios

### Step 7: Code Review Checklist
- [ ] Authentication is properly validated
- [ ] UUID path parameter is validated with Zod
- [ ] RLS policies are respected
- [ ] Soft delete filtering works correctly
- [ ] Error responses follow `ErrorResponse` format
- [ ] Sensitive fields (`user_id`, `deleted_at`) are excluded from response
- [ ] Not found errors return `404` (not `403`) to prevent information leakage
- [ ] TypeScript types are correctly used throughout

## 10. Additional Notes

### Service Layer Pattern
The service layer (`CardService.getCardById`) abstracts database operations from the API route handler, providing:
- Reusability across different endpoints
- Easier testing (mock service in tests)
- Centralized business logic
- Consistent error handling

### Not Found Handling
- Return `404 Not Found` for all cases where card is not accessible:
  - Card doesn't exist
  - Card belongs to another user
  - Card is soft-deleted
- This prevents information leakage (user cannot determine if a card ID exists but belongs to someone else)

### Single Row Query
- Use Supabase's `.single()` method to ensure exactly one row is returned
- This throws an error if zero or multiple rows are found (though multiple rows should never occur with primary key lookup)

