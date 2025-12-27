# API Endpoint Implementation Plan: Delete Card (DELETE /api/cards/:id)

## 1. Endpoint Overview

The Delete Card endpoint performs a soft delete on a card by setting the `deleted_at` timestamp. The card is not permanently removed from the database but is excluded from normal queries. Only active (non-deleted) cards can be deleted. The card must be owned by the authenticated user.

**Purpose**: Allow users to remove cards from their collection without permanently deleting them, supporting potential recovery and analytics.

**Business Value**: Enables card management while preserving data for analytics and potential recovery features.

## 2. Request Details

- **HTTP Method**: `DELETE`
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
- `DeleteCardResponse` (from `src/types.ts`):
  ```typescript
  {
    message: string;
  }
  ```

### Error Response Type
- `ErrorResponse` (from `src/types.ts`)

## 4. Response Details

### Success Response (200 OK)
```json
{
  "message": "Card deleted successfully"
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
    "message": "Card not found, not owned by user, or already deleted"
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

1. **Request Reception**: Astro API route handler receives DELETE request at `/api/cards/:id`
2. **Authentication**: Extract and validate JWT token from `Authorization` header
3. **User Identification**: Extract `user_id` from validated JWT token claims
4. **Path Parameter Validation**: Validate `id` parameter as UUID using Zod schema
5. **Service Layer Call**: Call `CardService.deleteCard(id, userId)`
6. **Database Update**: Service constructs Supabase update (not DELETE operation):
   - Filter by `id` and `user_id` (RLS also enforces this)
   - Filter by `deleted_at IS NULL` (only active cards can be deleted)
   - Set `deleted_at = now()`
7. **Verification**: Verify that exactly one row was updated (card existed and was active)
8. **Response Construction**: Build `DeleteCardResponse` with success message
9. **Response Return**: Return JSON response with `200 OK` status

### Database Interaction Details

- **Table**: `cards`
- **RLS Policy**: `cards_delete_own` enforces `auth.uid() = user_id AND deleted_at IS NULL`
- **Update Pattern** (soft delete):
  ```typescript
  const { data, error, count } = await supabase
    .from('cards')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', cardId)
    .eq('user_id', userId)
    .is('deleted_at', null)
    .select('id')
    .single();
  ```

### Soft Delete Implementation

- **Not a DELETE Operation**: Use UPDATE to set `deleted_at` timestamp
- **Permanent Exclusion**: Soft-deleted cards are excluded from normal queries by RLS policy
- **Recovery**: Cards can be recovered by setting `deleted_at = NULL` (not exposed in MVP API)

## 6. Security Considerations

### Authentication
- Same as Get Single Card endpoint

### Authorization
- **Row Level Security (RLS)**: Primary authorization mechanism
- **RLS Policy**: `cards_delete_own` ensures users can only soft-delete their own active cards
- **API-Level Filtering**: Additionally filter by `user_id` and `deleted_at IS NULL`
- **Information Leakage Prevention**: Return `404 Not Found` if card doesn't exist, isn't owned by user, or is already deleted

### Input Validation
- **UUID Validation**: Validate `id` path parameter as valid UUID format using Zod
- **SQL Injection Prevention**: Supabase client uses parameterized queries automatically

### Data Exposure
- **Minimal Response**: Response only includes success message (no card data)
- **Error Messages**: Do not expose whether card exists but belongs to another user

## 7. Error Handling

### Error Scenarios and Status Codes

#### 1. Authentication Errors (401 Unauthorized)
- Same as Get Single Card endpoint

#### 2. Validation Errors (400 Bad Request)
- **Scenario**: `id` parameter is not a valid UUID format
- **Handling**: Return `400` with `VALIDATION_ERROR` code
- **Logging**: Log validation errors with parameter values (sanitized)

#### 3. Not Found Errors (404 Not Found)
- **Scenario**: Card with given `id` does not exist
- **Scenario**: Card exists but is not owned by authenticated user
- **Scenario**: Card exists but is already soft-deleted
- **Handling**: Return `404` with `NOT_FOUND` code
- **Logging**: Log at INFO level (expected user behavior)

#### 4. Database Errors (500 Internal Server Error)
- **Scenario**: Database connection failure
- **Scenario**: Update operation failure
- **Handling**: Return `500` with `SERVER_ERROR` code
- **Logging**: Log full error details server-side (with error ID)

### Error Response Format
All errors follow the `ErrorResponse` type structure.

### Error Logging Strategy
- Same as Get Single Card endpoint

## 8. Performance Considerations

### Database Optimization
- **Index Utilization**: Query uses primary key (`id`) for efficient lookup
- **RLS Overhead**: RLS policies add minimal overhead
- **Soft Delete Index**: Optional index on `deleted_at` can optimize filtering (if not already present)

### Query Performance
- **Single Row Update**: Efficient single row update operation
- **Verification**: Check that exactly one row was updated to confirm success

### Potential Bottlenecks
- **None Identified**: Single row update by primary key is highly optimized

### Caching Considerations
- **Invalidation**: Invalidate any cached card lists after deletion
- **Future**: Consider caching user's total card count (invalidate on delete)

## 9. Implementation Steps

### Step 1: Reuse Validation Schema
1. Reuse `cardIdSchema` from `src/lib/validations/cards.ts` (UUID validation)

### Step 2: Update Card Service
1. Update `src/lib/services/card.service.ts`:
   - Function `deleteCard(cardId: string, userId: string)`: 
     - Parameters: `cardId` (UUID), `userId` (from JWT)
     - Constructs Supabase update to set `deleted_at = now()`
     - Filters by `id`, `user_id`, and `deleted_at IS NULL`
     - Verifies that exactly one row was updated
     - Throws `NotFoundError` if no rows were updated
     - Handle database errors and transform to service-level errors

### Step 3: Create API Route Handler
1. Create or update `src/pages/api/cards/[id].ts`:
   - Export `export const prerender = false;`
   - Implement `DELETE` handler:
     - Extract `id` from `context.params.id`
     - Extract and validate authentication
     - Validate `id` as UUID
     - Call `CardService.deleteCard(id, userId)`
     - Return JSON response with `200 OK` status and success message
   - Implement error handling:
     - Catch authentication errors → return `401`
     - Catch validation errors → return `400`
     - Catch `NotFoundError` → return `404`
     - Catch service/database errors → return `500`

### Step 4: Code Review Checklist
- [ ] Authentication is properly validated
- [ ] UUID path parameter is validated
- [ ] RLS policies are respected
- [ ] Soft delete uses UPDATE (not DELETE operation)
- [ ] Only active cards can be deleted (`deleted_at IS NULL` filter)
- [ ] Verification that exactly one row was updated
- [ ] Error responses follow `ErrorResponse` format
- [ ] Not found errors return `404` (not `403`)
- [ ] TypeScript types are correctly used throughout

## 10. Additional Notes

### Soft Delete vs. Hard Delete
- **Soft Delete**: Sets `deleted_at` timestamp (current implementation)
- **Hard Delete**: Permanently removes row from database (not implemented in MVP)
- **Benefits of Soft Delete**:
  - Preserves data for analytics
  - Enables potential recovery features
  - Maintains referential integrity
  - Supports audit trails

### Recovery (Future Feature)
- Soft-deleted cards can be recovered by setting `deleted_at = NULL`
- Not exposed in MVP API, but can be added post-MVP
- Consider adding `PATCH /api/cards/:id/restore` endpoint in the future

### Idempotency
- Deleting an already-deleted card returns `404 Not Found`
- This is acceptable behavior (not idempotent, but safe)

### Analytics Consideration
- Soft-deleted cards are excluded from normal queries
- Analytics events may still reference deleted cards (via `card_id` in context)
- Consider whether analytics should filter out deleted cards (post-MVP decision)

### Permanent Deletion (Future)
- Consider implementing permanent deletion for GDPR compliance (post-MVP)
- Would require hard DELETE operation with additional confirmation
- Should respect data retention policies

