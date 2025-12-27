# API Endpoint Implementation Plan: Get Cards for Practice (GET /api/cards/practice)

## 1. Endpoint Overview

The Get Cards for Practice endpoint retrieves all active cards for the authenticated user for practice mode. Cards are returned in a deterministic order (by `created_at DESC`); client-side shuffling is recommended to avoid expensive database `ORDER BY RANDOM()`. The endpoint supports an optional limit parameter for large collections.

**Purpose**: Provide all active cards for practice sessions in a deterministic order that can be shuffled client-side.

**Business Value**: Enables the practice mode feature by providing cards in a format optimized for client-side randomization and practice session management.

## 2. Request Details

- **HTTP Method**: `GET`
- **URL Structure**: `/api/cards/practice`
- **Parameters**:
  - **Required**: None
  - **Optional**:
    - `limit` (integer, default: all cards): Maximum number of cards to return (for large collections)
- **Request Headers**:
  - `Authorization: Bearer <supabase_jwt_token>` (required)
- **Request Body**: None

## 3. Used Types

### Request Types
- Query parameter `limit` is validated using Zod schema (optional integer >= 1)

### Response Types
- `PracticeCardsResponse` (from `src/types.ts`):
  ```typescript
  {
    data: CardDTO[];
    count: number;
  }
  ```

### Error Response Type
- `ErrorResponse` (from `src/types.ts`)

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
  "count": 10
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

#### 400 Bad Request (Invalid Limit)
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid query parameters",
    "details": {
      "limit": "Limit must be a positive integer"
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

1. **Request Reception**: Astro API route handler receives GET request at `/api/cards/practice`
2. **Authentication**: Extract and validate JWT token from `Authorization` header
3. **User Identification**: Extract `user_id` from validated JWT token claims
4. **Query Parameter Validation**: Validate and parse query parameters using Zod schema:
   - `limit`: Optional integer >= 1 (default: no limit, return all cards)
5. **Service Layer Call**: Call `CardService.getPracticeCards(userId, limit)`
6. **Database Query**: Service constructs Supabase query:
   - Filter by `user_id` (RLS also enforces this)
   - Filter by `deleted_at IS NULL` (only active cards)
   - Order by `created_at DESC` (deterministic order for client-side shuffling)
   - Apply optional limit if provided
   - Select specific columns: `id, front, back, origin, created_at, updated_at`
7. **Data Transformation**: Service maps database rows to `CardDTO[]` format
8. **Response Construction**: Build `PracticeCardsResponse` with `data` array and `count`
9. **Response Return**: Return JSON response with `200 OK` status

### Database Interaction Details

- **Table**: `cards`
- **RLS Policy**: `cards_select_own` enforces `auth.uid() = user_id AND deleted_at IS NULL`
- **Query Pattern**:
  ```typescript
  let query = supabase
    .from('cards')
    .select('id, front, back, origin, created_at, updated_at')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  
  if (limit !== undefined) {
    query = query.limit(limit);
  }
  
  const { data, error } = await query;
  ```

### Deterministic Ordering

- **Order**: By `created_at DESC` (newest first)
- **Purpose**: Provides consistent, deterministic order for client-side shuffling
- **Performance**: Avoids expensive `ORDER BY RANDOM()` at database level
- **Client Responsibility**: Client should shuffle the array after receiving data

## 6. Security Considerations

### Authentication
- Same as List Cards endpoint

### Authorization
- **Row Level Security (RLS)**: Primary authorization mechanism
- **RLS Policy**: `cards_select_own` ensures users can only access their own active cards
- **API-Level Filtering**: Additionally filter by `user_id` and `deleted_at IS NULL`

### Input Validation
- **Limit Validation**: Validate `limit` as positive integer if provided
- **SQL Injection Prevention**: Supabase client uses parameterized queries automatically

### Data Exposure
- **DTO Filtering**: Exclude sensitive fields (`user_id`, `deleted_at`) from response
- **No Pagination**: Returns all cards (or up to limit), which may be large for users with many cards

## 7. Error Handling

### Error Scenarios and Status Codes

#### 1. Authentication Errors (401 Unauthorized)
- Same as List Cards endpoint

#### 2. Validation Errors (400 Bad Request)
- **Scenario**: `limit` parameter is not a valid integer or is < 1
- **Handling**: Return `400` with `VALIDATION_ERROR` code
- **Logging**: Log validation errors with parameter values (sanitized)

#### 3. Database Errors (500 Internal Server Error)
- **Scenario**: Database connection failure
- **Scenario**: Query execution error
- **Handling**: Return `500` with `SERVER_ERROR` code
- **Logging**: Log full error details server-side (with error ID)

### Error Response Format
All errors follow the `ErrorResponse` type structure.

### Error Logging Strategy
- Same as List Cards endpoint

## 8. Performance Considerations

### Database Optimization
- **Index Utilization**: Query leverages `idx_cards_user_id_created_at` index for efficient chronological retrieval
- **No Count Query**: Unlike List Cards endpoint, no separate count query needed (use `data.length`)
- **Select Specific Columns**: Only select required columns to reduce data transfer

### Query Performance
- **Deterministic Ordering**: `ORDER BY created_at DESC` is efficient with proper index
- **Optional Limit**: Limit parameter helps with large collections
- **No Random Ordering**: Avoids expensive `ORDER BY RANDOM()` at database level

### Potential Bottlenecks
- **Large Collections**: Users with many cards may receive large response payloads
  - **Mitigation**: Optional `limit` parameter allows clients to request fewer cards
  - **Future**: Consider pagination or cursor-based approach for very large collections
- **Memory Usage**: Loading all cards into memory (if no limit)
  - **Mitigation**: Acceptable for MVP, consider pagination post-MVP

### Caching Opportunities (Future)
- Cache practice cards list (with short TTL, e.g., 30 seconds)
- Invalidate cache on card create/update/delete operations
- Consider caching for users with stable card collections

### Client-Side Shuffling
- **Recommendation**: Client should shuffle the array after receiving data
- **Performance**: Client-side shuffling is more efficient than database `ORDER BY RANDOM()`
- **Deterministic Seed**: Consider adding optional `seed` parameter for reproducible shuffling (future)

## 9. Implementation Steps

### Step 1: Create Validation Schema
1. Create or update `src/lib/validations/cards.ts`:
   - Define Zod schema for query parameters:
     ```typescript
     const practiceCardsQuerySchema = z.object({
       limit: z.coerce.number().int().min(1).optional(),
     });
     ```

### Step 2: Update Card Service
1. Update `src/lib/services/card.service.ts`:
   - Function `getPracticeCards(userId: string, limit?: number)`: 
     - Parameters: `userId` (from JWT), `limit` (optional)
     - Constructs Supabase query with RLS-aware filtering
     - Orders by `created_at DESC` (deterministic order)
     - Applies optional limit if provided
     - Returns `{ data: CardDTO[], count: number }`
     - Handle database errors and transform to service-level errors
     - Map database rows to `CardDTO[]` (exclude `user_id` and `deleted_at`)

### Step 3: Create API Route Handler
1. Create `src/pages/api/cards/practice.ts`:
   - Export `export const prerender = false;` (required for API routes)
   - Implement `GET` handler:
     - Extract and validate authentication
     - Parse and validate query parameters using Zod schema
     - Call `CardService.getPracticeCards(userId, limit)`
     - Construct `PracticeCardsResponse` with `data` and `count = data.length`
     - Return JSON response with `200 OK` status
   - Implement error handling:
     - Catch authentication errors → return `401`
     - Catch validation errors → return `400`
     - Catch service/database errors → return `500`
     - Use consistent `ErrorResponse` format

### Step 4: Code Review Checklist
- [ ] Authentication is properly validated
- [ ] Query parameters are validated with Zod
- [ ] RLS policies are respected
- [ ] Soft delete filtering works correctly
- [ ] Deterministic ordering (by `created_at DESC`)
- [ ] Optional limit parameter works correctly
- [ ] Count is calculated from `data.length`
- [ ] Error responses follow `ErrorResponse` format
- [ ] Sensitive fields are excluded from response
- [ ] TypeScript types are correctly used throughout

## 10. Additional Notes

### Difference from List Cards Endpoint
- **No Pagination**: Returns all cards (or up to limit) instead of paginated results
- **Simpler Response**: Returns `count` instead of full pagination metadata
- **Deterministic Order**: Always orders by `created_at DESC` (no sorting options)
- **Purpose**: Optimized for practice mode (client-side shuffling)

### Client-Side Shuffling
- **Recommendation**: Document that clients should shuffle the array
- **Performance**: More efficient than database-level random ordering
- **Deterministic Seed**: Consider adding optional `seed` parameter for reproducible shuffling (future enhancement)

### Limit Parameter
- **Default Behavior**: If `limit` is not provided, return all active cards
- **Use Case**: Useful for users with large collections who want to practice a subset
- **Future**: Consider making limit required or setting a reasonable default (e.g., 100)

### Empty Result Set
- Valid scenario: Return empty `data` array with `count: 0`
- Client should handle empty state gracefully

### Future Enhancements
- Add filtering options (e.g., by `origin`, by date range)
- Add sorting options (though deterministic order is preferred for shuffling)
- Consider pagination for very large collections
- Add `seed` parameter for reproducible shuffling

