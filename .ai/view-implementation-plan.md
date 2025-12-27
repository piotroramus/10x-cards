# API Endpoint Implementation Plan: List Cards (GET /api/cards)

## 1. Endpoint Overview

The List Cards endpoint retrieves all active (non-deleted) cards for the authenticated user, ordered by creation date (newest first). The endpoint supports pagination with configurable page size and an optional flag to include soft-deleted cards for admin/analytics purposes. The endpoint relies on Supabase Row Level Security (RLS) policies to ensure users can only access their own cards.

**Purpose**: Provide paginated access to a user's flashcard collection with support for filtering out soft-deleted cards.

**Business Value**: Enables users to browse their card collection efficiently, supporting the core flashcard management functionality of the application.

## 2. Request Details

- **HTTP Method**: `GET`
- **URL Structure**: `/api/cards`
- **Parameters**:
  - **Required**: None
  - **Optional**:
    - `page` (integer, default: 1): Page number for pagination (must be >= 1)
    - `limit` (integer, default: 50, max: 100): Number of cards per page (must be between 1 and 100)
    - `include_deleted` (boolean, default: false): Include soft-deleted cards in results
- **Request Headers**:
  - `Authorization: Bearer <supabase_jwt_token>` (required)
- **Request Body**: None

## 3. Used Types

### Request Types
- Query parameters are validated using Zod schema (no explicit TypeScript types needed for query params)

### Response Types
- `ListCardsResponse` (from `src/types.ts`):
  ```typescript
  {
    data: CardDTO[];
    pagination: PaginationMeta;
  }
  ```
- `CardDTO` (from `src/types.ts`):
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
- `PaginationMeta` (from `src/types.ts`):
  ```typescript
  {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  }
  ```

### Error Response Type
- `ErrorResponse` (from `src/types.ts`):
  ```typescript
  {
    error: {
      code: ErrorCode;
      message: string;
      details?: Record<string, unknown>;
    }
  }
  ```

## 4. Response Details

### Success Response (200 OK)
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

#### 400 Bad Request (Invalid Query Parameters)
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid query parameters",
    "details": {
      "page": "Page must be a positive integer",
      "limit": "Limit must be between 1 and 100"
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

1. **Request Reception**: Astro API route handler receives GET request at `/api/cards`
2. **Authentication**: Middleware or route handler extracts JWT token from `Authorization` header and validates it using Supabase client
3. **User Identification**: Extract `user_id` from validated JWT token claims
4. **Query Parameter Validation**: Validate and parse query parameters using Zod schema:
   - `page`: integer >= 1, default 1
   - `limit`: integer between 1 and 100, default 50
   - `include_deleted`: boolean, default false
5. **Service Layer Call**: Call `CardService.listCards()` with validated parameters and `user_id`
6. **Database Query**: Service constructs Supabase query:
   - Filter by `user_id` (RLS also enforces this)
   - Conditionally filter by `deleted_at IS NULL` based on `include_deleted` flag
   - Order by `created_at DESC` (optimized by index `idx_cards_user_id_created_at`)
   - Apply pagination using `.range()` method
   - Count total records for pagination metadata
7. **Data Transformation**: Service maps database rows to `CardDTO` format (excludes `user_id` and `deleted_at`)
8. **Pagination Calculation**: Calculate `total_pages` from `total` and `limit`
9. **Response Construction**: Build `ListCardsResponse` with `data` array and `pagination` metadata
10. **Response Return**: Return JSON response with appropriate status code

### Database Interaction Details

- **Table**: `cards`
- **RLS Policy**: `cards_select_own` enforces `auth.uid() = user_id AND deleted_at IS NULL` (unless `include_deleted=true`)
- **Index Used**: `idx_cards_user_id_created_at` on `(user_id, created_at DESC)` for efficient chronological retrieval
- **Query Pattern**:
  ```typescript
  let query = supabase
    .from('cards')
    .select('id, front, back, origin, created_at, updated_at', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (!includeDeleted) {
    query = query.is('deleted_at', null);
  }
  
  const { data, count, error } = await query
    .range((page - 1) * limit, page * limit - 1);
  ```

## 6. Security Considerations

### Authentication
- **JWT Token Validation**: Extract and validate Supabase JWT token from `Authorization` header
- **Token Format**: Must be `Bearer <token>`
- **Validation Method**: Use Supabase client's `auth.getUser()` or verify token using `supabase.auth.getSession()`
- **Failure Handling**: Return `401 Unauthorized` if token is missing, invalid, or expired

### Authorization
- **Row Level Security (RLS)**: Primary authorization mechanism enforced at database level
- **RLS Policy**: `cards_select_own` ensures users can only access their own cards
- **API-Level Filtering**: Additionally filter by `user_id` in query for defense in depth (though RLS handles this)
- **Soft Delete Protection**: By default, exclude soft-deleted cards unless `include_deleted=true` is explicitly set

### Input Validation
- **Query Parameter Validation**: Use Zod schema to validate and sanitize query parameters
- **Type Coercion**: Convert string query parameters to appropriate types (integer, boolean)
- **Range Validation**: Enforce `page >= 1`, `limit` between 1 and 100
- **SQL Injection Prevention**: Supabase client uses parameterized queries automatically

### Data Exposure
- **DTO Filtering**: Exclude sensitive fields (`user_id`, `deleted_at`) from response
- **Information Leakage**: Do not expose existence of other users' cards (RLS prevents access, but ensure error messages don't leak information)

### Rate Limiting (Future Consideration)
- Consider implementing rate limiting to prevent abuse
- Monitor for unusual query patterns (e.g., excessive pagination requests)

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
- **Scenario**: `page` parameter is not a valid integer or is < 1
- **Scenario**: `limit` parameter is not a valid integer or is outside 1-100 range
- **Scenario**: `include_deleted` parameter is not a valid boolean
- **Handling**: Return `400` with `VALIDATION_ERROR` code and detailed error messages
- **Logging**: Log validation errors with parameter values (sanitized)

#### 3. Database Errors (500 Internal Server Error)
- **Scenario**: Database connection failure
- **Scenario**: Query execution error
- **Scenario**: Unexpected database error
- **Handling**: Return `500` with `SERVER_ERROR` code
- **Logging**: Log full error details server-side (with error ID for correlation)
- **User Message**: Generic error message (do not expose internal details)

#### 4. Edge Cases
- **Empty Result Set**: Valid scenario, return empty `data` array with `total: 0`
- **Page Beyond Total**: If `page > total_pages`, return empty `data` array (or consider returning 404)
- **Zero Cards**: Return empty array with correct pagination metadata

### Error Response Format
All errors follow the `ErrorResponse` type structure:
```typescript
{
  error: {
    code: "VALIDATION_ERROR" | "AUTHENTICATION_ERROR" | "SERVER_ERROR",
    message: string,
    details?: Record<string, unknown>
  }
}
```

### Error Logging Strategy
- **Authentication Errors**: Log at WARN level with user identifier (if available)
- **Validation Errors**: Log at INFO level (expected user errors)
- **Database Errors**: Log at ERROR level with full stack trace and error ID
- **Never Log**: JWT tokens, sensitive user data

## 8. Performance Considerations

### Database Optimization
- **Index Utilization**: Query leverages `idx_cards_user_id_created_at` index for efficient chronological retrieval
- **Pagination**: Use Supabase's `.range()` method for efficient offset-based pagination
- **Count Query**: Use `count: 'exact'` option in Supabase query to get total count in single query
- **Select Specific Columns**: Only select required columns (`id, front, back, origin, created_at, updated_at`) to reduce data transfer

### Query Performance
- **RLS Overhead**: RLS policies add minimal overhead but ensure security
- **Soft Delete Filtering**: `deleted_at IS NULL` filter is efficient with proper indexing
- **Large Result Sets**: Pagination prevents loading all cards at once

### Potential Bottlenecks
- **Count Query**: Counting total records can be slow for users with many cards
  - **Mitigation**: Consider caching total count (with short TTL) or using approximate counts for large datasets
- **Offset Pagination**: Large offsets can be slow (e.g., `page=1000`)
  - **Mitigation**: Consider cursor-based pagination for future optimization
  - **Current**: Acceptable for MVP with reasonable page limits

### Caching Opportunities (Future)
- Cache user's total card count (with short TTL, e.g., 30 seconds)
- Cache first page of results for authenticated users (with short TTL)
- Invalidate cache on card create/update/delete operations

### Connection Pooling
- Use Supabase connection pooling for production workloads
- Monitor connection pool usage and adjust as needed

## 9. Implementation Steps

### Step 1: Install Dependencies
1. Install Zod for validation:
   ```bash
   npm install zod
   ```

### Step 2: Create Authentication Helper
1. Create `src/lib/auth.ts`:
   - Function `getAuthenticatedUser(context: APIContext)`: Extracts and validates JWT token
   - Returns `{ user: User }` or throws authentication error
   - Uses `context.locals.supabase.auth.getUser()` or `getSession()`

### Step 3: Create Validation Schemas
1. Create `src/lib/validations/cards.ts`:
   - Define Zod schema for query parameters:
     ```typescript
     const listCardsQuerySchema = z.object({
       page: z.coerce.number().int().min(1).default(1),
       limit: z.coerce.number().int().min(1).max(100).default(50),
       include_deleted: z.coerce.boolean().default(false),
     });
     ```

### Step 4: Create Card Service
1. Create `src/lib/services/card.service.ts`:
   - Function `listCards(userId: string, options: ListCardsOptions)`: 
     - Parameters: `userId`, `page`, `limit`, `includeDeleted`
     - Constructs Supabase query with RLS-aware filtering
     - Applies pagination and ordering
     - Returns `{ data: CardDTO[], total: number }`
   - Handle database errors and transform to service-level errors
   - Map database rows to `CardDTO` (exclude `user_id` and `deleted_at`)

### Step 5: Create API Route Handler
1. Create `src/pages/api/cards/index.ts`:
   - Export `export const prerender = false;` (required for API routes)
   - Implement `GET` handler:
     - Extract and validate authentication (use helper from Step 2)
     - Parse and validate query parameters (use schema from Step 3)
     - Call `CardService.listCards()` with validated parameters
     - Calculate pagination metadata (`total_pages = Math.ceil(total / limit)`)
     - Construct `ListCardsResponse`
     - Return JSON response with `200 OK` status
   - Implement error handling:
     - Catch authentication errors → return `401`
     - Catch validation errors → return `400`
     - Catch service/database errors → return `500`
     - Use consistent `ErrorResponse` format

### Step 6: Error Handling Utilities
1. Create `src/lib/errors/api-errors.ts`:
   - Define error factory functions:
     - `createValidationError(message, details)`
     - `createAuthenticationError(message)`
     - `createServerError(message)`
   - Helper function `handleApiError(error, context)` for consistent error responses

### Step 7: Type Safety
1. Ensure `CardDTO` and `ListCardsResponse` types are correctly imported from `src/types.ts`
2. Verify database types from `src/db/database.types.ts` match expected structure
3. Use TypeScript strict mode for compile-time type checking

### Step 8: Testing Considerations
1. **Unit Tests** (future):
   - Test query parameter validation
   - Test pagination calculations
   - Test DTO mapping
2. **Integration Tests** (future):
   - Test authentication flow
   - Test database query with RLS
   - Test pagination behavior
   - Test error scenarios

### Step 9: Documentation
1. Update API documentation with endpoint details
2. Document query parameter behavior and defaults
3. Document error response formats

### Step 10: Code Review Checklist
- [ ] Authentication is properly validated
- [ ] Query parameters are validated with Zod
- [ ] RLS policies are respected (database enforces, but API also filters)
- [ ] Soft delete filtering works correctly
- [ ] Pagination calculations are correct (edge cases: empty results, page beyond total)
- [ ] Error responses follow `ErrorResponse` format
- [ ] Sensitive fields (`user_id`, `deleted_at`) are excluded from response
- [ ] Database queries use indexes efficiently
- [ ] Error logging is implemented (without sensitive data)
- [ ] TypeScript types are correctly used throughout

## 10. Additional Notes

### Service Layer Pattern
The service layer (`CardService`) abstracts database operations from the API route handler, providing:
- Reusability across different endpoints
- Easier testing (mock service in tests)
- Centralized business logic
- Consistent error handling

### Query Parameter Defaults
- Default values are applied in Zod schema using `.default()`
- This ensures consistent behavior even when parameters are omitted

### Pagination Metadata
- `total_pages` is calculated as `Math.ceil(total / limit)`
- Edge case: If `total = 0`, `total_pages = 0` (or consider `1` for consistency)

### Soft Delete Handling
- By default, soft-deleted cards are excluded (`deleted_at IS NULL`)
- `include_deleted=true` flag allows including deleted cards (for admin/analytics)
- RLS policy `cards_select_own` handles filtering, but API should also filter for clarity

### Future Enhancements
- Cursor-based pagination for better performance with large datasets
- Filtering by `origin` (ai/manual)
- Sorting options (by `updated_at`, alphabetical, etc.)
- Search/filter functionality
- Caching layer for frequently accessed data

