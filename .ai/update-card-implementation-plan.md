# API Endpoint Implementation Plan: Update Card (PATCH /api/cards/:id)

## 1. Endpoint Overview

The Update Card endpoint allows users to update an existing card's `front` and/or `back` fields. Only active (non-deleted) cards can be updated. The `updated_at` timestamp is automatically updated by a database trigger. The card must be owned by the authenticated user.

**Purpose**: Enable users to edit their existing flashcards to correct mistakes or update content.

**Business Value**: Supports card maintenance and content refinement, allowing users to improve their flashcard collection over time.

## 2. Request Details

- **HTTP Method**: `PATCH`
- **URL Structure**: `/api/cards/:id`
- **Parameters**:
  - **Required**:
    - `id` (UUID, path parameter): Card identifier
  - **Optional**: None
- **Request Headers**:
  - `Authorization: Bearer <supabase_jwt_token>` (required)
  - `Content-Type: application/json` (required)
- **Request Body**:
```json
{
  "front": "string" (optional),
  "back": "string" (optional)
}
```

## 3. Used Types

### Request Types
- `UpdateCardCommand` (from `src/types.ts`):
  ```typescript
  {
    front?: string;
    back?: string;
  }
  ```

### Response Types
- `UpdateCardResponse` (from `src/types.ts`), which is `CardDTO`:
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
    "message": "Card not found, not owned by user, or already deleted"
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
      "front": "Front must be 200 characters or less",
      "back": "Back must be 500 characters or less"
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

1. **Request Reception**: Astro API route handler receives PATCH request at `/api/cards/:id`
2. **Authentication**: Extract and validate JWT token from `Authorization` header
3. **User Identification**: Extract `user_id` from validated JWT token claims
4. **Path Parameter Validation**: Validate `id` parameter as UUID using Zod schema
5. **Request Body Validation**: Parse and validate JSON body using Zod schema:
   - `front`: Optional string, max 200 characters (if provided)
   - `back`: Optional string, max 500 characters (if provided)
   - At least one field must be provided
6. **Service Layer Call**: Call `CardService.updateCard(id, command, userId)`
7. **Database Update**: Service constructs Supabase update:
   - Filter by `id` and `user_id` (RLS also enforces this)
   - Filter by `deleted_at IS NULL` (only active cards)
   - Update provided fields (`front` and/or `back`)
   - Database trigger automatically updates `updated_at` timestamp
8. **Data Transformation**: Service maps database row to `CardDTO` format
9. **Response Construction**: Build `UpdateCardResponse` with updated card
10. **Response Return**: Return JSON response with `200 OK` status

### Database Interaction Details

- **Table**: `cards`
- **RLS Policy**: `cards_update_own` enforces `auth.uid() = user_id AND deleted_at IS NULL`
- **Update Pattern**:
  ```typescript
  const updateData: { front?: string; back?: string } = {};
  if (command.front !== undefined) updateData.front = command.front;
  if (command.back !== undefined) updateData.back = command.back;
  
  const { data, error } = await supabase
    .from('cards')
    .update(updateData)
    .eq('id', cardId)
    .eq('user_id', userId)
    .is('deleted_at', null)
    .select('id, front, back, origin, created_at, updated_at')
    .single();
  ```

### Trigger Behavior

- **Trigger**: `trigger_set_updated_at` automatically updates `updated_at` on row modification
- **No Manual Update**: Do not manually set `updated_at` in update query

## 6. Security Considerations

### Authentication
- Same as Get Single Card endpoint

### Authorization
- **Row Level Security (RLS)**: Primary authorization mechanism
- **RLS Policy**: `cards_update_own` ensures users can only update their own active cards
- **API-Level Filtering**: Additionally filter by `user_id` and `deleted_at IS NULL`
- **Information Leakage Prevention**: Return `404 Not Found` if card doesn't exist or isn't owned by user

### Input Validation
- **Character Limits**: Enforce `front <= 200` and `back <= 500` characters (if provided)
- **Optional Fields**: Both `front` and `back` are optional, but at least one must be provided
- **Empty String Handling**: Consider whether empty strings are allowed (likely not, validate as non-empty if provided)
- **XSS Prevention**: Sanitize HTML/JavaScript in updated fields
- **SQL Injection Prevention**: Supabase client uses parameterized queries automatically

### Data Exposure
- Same as Get Single Card endpoint

## 7. Error Handling

### Error Scenarios and Status Codes

#### 1. Authentication Errors (401 Unauthorized)
- Same as Get Single Card endpoint

#### 2. Validation Errors (400 Bad Request)
- **Scenario**: `id` parameter is not a valid UUID format
- **Scenario**: Neither `front` nor `back` is provided in request body
- **Scenario**: `front` or `back` is empty string (if empty strings are not allowed)
- **Scenario**: `front` exceeds 200 characters
- **Scenario**: `back` exceeds 500 characters
- **Scenario**: Invalid JSON in request body
- **Handling**: Return `400` with `VALIDATION_ERROR` code and detailed field-level error messages
- **Logging**: Log validation errors with field names (sanitize values)

#### 3. Not Found Errors (404 Not Found)
- **Scenario**: Card with given `id` does not exist
- **Scenario**: Card exists but is not owned by authenticated user
- **Scenario**: Card exists but is soft-deleted
- **Handling**: Return `404` with `NOT_FOUND` code
- **Logging**: Log at INFO level (expected user behavior)

#### 4. Database Errors (500 Internal Server Error)
- **Scenario**: Database connection failure
- **Scenario**: Update operation failure
- **Scenario**: CHECK constraint violation (should be caught by validation)
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
- **Select Specific Columns**: Only select required columns after update

### Query Performance
- **Single Row Update**: Efficient single row update operation
- **Trigger Execution**: `updated_at` trigger adds minimal overhead

### Potential Bottlenecks
- **None Identified**: Single row update by primary key is highly optimized

### Caching Considerations
- **Invalidation**: Invalidate any cached card data after update
- **Future**: Consider caching individual cards (invalidate on update)

## 9. Implementation Steps

### Step 1: Create Validation Schema
1. Create or update `src/lib/validations/cards.ts`:
   - Define Zod schema for `UpdateCardCommand`:
     ```typescript
     const updateCardSchema = z.object({
       front: z.string().min(1).max(200).optional(),
       back: z.string().min(1).max(500).optional(),
     }).refine(data => data.front !== undefined || data.back !== undefined, {
       message: "At least one field (front or back) must be provided"
     });
     ```

### Step 2: Update Card Service
1. Update `src/lib/services/card.service.ts`:
   - Function `updateCard(cardId: string, command: UpdateCardCommand, userId: string)`: 
     - Parameters: `cardId` (UUID), `command` (validated), `userId` (from JWT)
     - Constructs Supabase update with conditional field updates
     - Filters by `id`, `user_id`, and `deleted_at IS NULL`
     - Returns `CardDTO` or throws `NotFoundError`
     - Handle database errors and transform to service-level errors
     - Map database row to `CardDTO`

### Step 3: Create API Route Handler
1. Create or update `src/pages/api/cards/[id].ts`:
   - Export `export const prerender = false;`
   - Implement `PATCH` handler:
     - Extract `id` from `context.params.id`
     - Extract and validate authentication
     - Validate `id` as UUID
     - Parse and validate request body using Zod schema
     - Call `CardService.updateCard(id, command, userId)`
     - Return JSON response with `200 OK` status
   - Implement error handling:
     - Catch authentication errors → return `401`
     - Catch validation errors → return `400`
     - Catch `NotFoundError` → return `404`
     - Catch service/database errors → return `500`

### Step 4: Code Review Checklist
- [ ] Authentication is properly validated
- [ ] UUID path parameter is validated
- [ ] Request body is validated with Zod (optional fields, character limits)
- [ ] At least one field must be provided validation
- [ ] RLS policies are respected
- [ ] Soft delete filtering works correctly
- [ ] `updated_at` is updated by trigger (not manually)
- [ ] Error responses follow `ErrorResponse` format
- [ ] Sensitive fields are excluded from response
- [ ] Not found errors return `404` (not `403`)
- [ ] TypeScript types are correctly used throughout

## 10. Additional Notes

### Partial Updates
- Both `front` and `back` are optional fields
- At least one field must be provided (enforced by Zod schema refinement)
- Only provided fields are updated (Supabase handles this automatically)

### Empty String Handling
- Consider whether empty strings should be allowed
- Recommendation: Reject empty strings (use `.min(1)` in Zod schema)
- This prevents accidentally clearing card content

### Updated At Timestamp
- `updated_at` is automatically updated by database trigger `trigger_set_updated_at`
- Do not manually set `updated_at` in update query
- Trigger ensures consistency across all update operations

### Origin Field
- `origin` field cannot be updated (not included in `UpdateCardCommand`)
- This preserves the original creation method (AI vs. manual)

### Idempotency
- Multiple updates with the same data are idempotent
- `updated_at` will change even if values don't change (trigger behavior)
- Consider this when implementing caching strategies

