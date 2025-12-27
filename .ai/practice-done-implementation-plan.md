# API Endpoint Implementation Plan: Track Practice Session Completion (POST /api/analytics/practice-done)

## 1. Endpoint Overview

The Track Practice Session Completion endpoint is a convenience endpoint to track practice session completion. It creates an analytics event `practice_done` with session statistics (card count and correct count). This endpoint is called when a practice session ends.

**Purpose**: Provide a simple way to track practice session completion with session statistics.

**Business Value**: Enables tracking of practice session performance, supporting analytics and KPI measurement for user engagement and learning effectiveness.

## 2. Request Details

- **HTTP Method**: `POST`
- **URL Structure**: `/api/analytics/practice-done`
- **Parameters**: None
- **Request Headers**:
  - `Authorization: Bearer <supabase_jwt_token>` (required)
  - `Content-Type: application/json` (required)
- **Request Body**:
```json
{
  "card_count": 10,
  "correct_count": 8
}
```

## 3. Used Types

### Request Types
- `PracticeDoneCommand` (from `src/types.ts`):
  ```typescript
  {
    card_count: number;
    correct_count: number;
  }
  ```

### Response Types
- `PracticeDoneResponse` (from `src/types.ts`):
  ```typescript
  {
    id: string;
    event_type: "practice_done";
    origin: null;
    context: PracticeDoneContext;
    created_at: string;
  }
  ```
- `PracticeDoneContext` (from `src/types.ts`):
  ```typescript
  {
    card_count: number;
    correct_count: number;
  }
  ```

### Error Response Type
- `ErrorResponse` (from `src/types.ts`)

## 4. Response Details

### Success Response (201 Created)
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
      "card_count": "Card count must be a positive integer",
      "correct_count": "Correct count must be a non-negative integer and cannot exceed card count"
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

1. **Request Reception**: Astro API route handler receives POST request at `/api/analytics/practice-done`
2. **Authentication**: Extract and validate JWT token from `Authorization` header
3. **User Identification**: Extract `user_id` from validated JWT token claims
4. **Request Body Validation**: Parse and validate JSON body using Zod schema:
   - `card_count`: Required, positive integer (>= 1)
   - `correct_count`: Required, non-negative integer (>= 0), must be <= `card_count`
5. **Service Layer Call**: Call `AnalyticsService.trackPracticeDone(command, userId)`
6. **Database Insert**: Service constructs Supabase insert:
   - Set `user_id` from authenticated user
   - Set `event_type = 'practice_done'`
   - Set `origin = null`
   - Set `context = { card_count, correct_count }`
   - Database generates `id` (UUID) and `created_at` timestamp
7. **Data Transformation**: Service maps database row to `PracticeDoneResponse` format (excludes `user_id`)
8. **Response Construction**: Build `PracticeDoneResponse` with created event
9. **Response Return**: Return JSON response with `201 Created` status

### Database Interaction Details

- **Table**: `analytics_events`
- **RLS Policy**: `analytics_events_insert_own` enforces `auth.uid() = user_id`
- **Insert Pattern**:
  ```typescript
  const { data, error } = await supabase
    .from('analytics_events')
    .insert({
      user_id: userId,
      event_type: 'practice_done',
      origin: null,
      context: {
        card_count: command.card_count,
        correct_count: command.correct_count
      }
    })
    .select('id, event_type, origin, context, created_at')
    .single();
  ```

## 6. Security Considerations

### Authentication
- Same as Track Analytics Event endpoint

### Authorization
- Same as Track Analytics Event endpoint

### Input Validation
- **Card Count**: Must be positive integer (>= 1)
- **Correct Count**: Must be non-negative integer (>= 0)
- **Logical Validation**: `correct_count` must be <= `card_count`
- **Data Types**: Validate number types
- **SQL Injection Prevention**: Supabase client uses parameterized queries automatically

### Data Exposure
- Same as Track Analytics Event endpoint

## 7. Error Handling

### Error Scenarios and Status Codes

#### 1. Authentication Errors (401 Unauthorized)
- Same as Track Analytics Event endpoint

#### 2. Validation Errors (400 Bad Request)
- **Scenario**: Missing `card_count` or `correct_count` field
- **Scenario**: `card_count` is not a positive integer (<= 0)
- **Scenario**: `correct_count` is not a non-negative integer (< 0)
- **Scenario**: `correct_count` exceeds `card_count`
- **Scenario**: Invalid data types (non-number values)
- **Scenario**: Invalid JSON in request body
- **Handling**: Return `400` with `VALIDATION_ERROR` code and detailed field-level error messages
- **Logging**: Log validation errors with field names and values

#### 3. Database Errors (500 Internal Server Error)
- Same as Track Analytics Event endpoint

### Error Response Format
All errors follow the `ErrorResponse` type structure.

### Error Logging Strategy
- Same as Track Analytics Event endpoint

## 8. Performance Considerations

### Database Optimization
- Same as Track Analytics Event endpoint

### Query Performance
- Same as Track Analytics Event endpoint

### Potential Bottlenecks
- Same as Track Analytics Event endpoint

### Retention Policy
- Same as Track Analytics Event endpoint (90-day retention)

## 9. Implementation Steps

### Step 1: Create Validation Schema
1. Create or update `src/lib/validations/analytics.ts`:
   - Define Zod schema for `PracticeDoneCommand`:
     ```typescript
     const practiceDoneSchema = z.object({
       card_count: z.number().int().positive("Card count must be a positive integer"),
       correct_count: z.number().int().nonnegative("Correct count must be a non-negative integer"),
     }).refine(data => data.correct_count <= data.card_count, {
       message: "Correct count cannot exceed card count",
       path: ["correct_count"]
     });
     ```

### Step 2: Update Analytics Service
1. Update `src/lib/services/analytics.service.ts`:
   - Function `trackPracticeDone(command: PracticeDoneCommand, userId: string)`: 
     - Parameters: `command` (validated), `userId` (from JWT)
     - Constructs Supabase insert with fixed values:
       - `event_type = 'practice_done'`
       - `origin = null`
       - `context = { card_count, correct_count }`
     - Inserts event into database
     - Returns `PracticeDoneResponse`
     - Handle database errors and transform to service-level errors
     - Map database row to `PracticeDoneResponse` (exclude `user_id`)

### Step 3: Create API Route Handler
1. Create `src/pages/api/analytics/practice-done.ts`:
   - Export `export const prerender = false;`
   - Implement `POST` handler:
     - Extract and validate authentication
     - Parse and validate request body using Zod schema
     - Call `AnalyticsService.trackPracticeDone(command, userId)`
     - Return JSON response with `201 Created` status
   - Implement error handling:
     - Catch authentication errors → return `401`
     - Catch validation errors → return `400` with field-level details
     - Catch service/database errors → return `500`
     - Use consistent `ErrorResponse` format

### Step 4: Code Review Checklist
- [ ] Authentication is properly validated
- [ ] Request body is validated with Zod (card_count, correct_count, logical validation)
- [ ] `correct_count <= card_count` validation
- [ ] RLS policies are respected
- [ ] `user_id` is set from JWT token
- [ ] `event_type` is fixed to `'practice_done'`
- [ ] `origin` is fixed to `null`
- [ ] Error responses follow `ErrorResponse` format
- [ ] `user_id` is excluded from response
- [ ] TypeScript types are correctly used throughout

## 10. Additional Notes

### Convenience Endpoint
- This endpoint is a convenience wrapper around the generic Track Analytics Event endpoint
- It simplifies client-side code by providing a dedicated endpoint for practice completion
- Internally, it creates a `practice_done` event with fixed `event_type` and `origin`

### Fixed Values
- `event_type`: Always `'practice_done'` (not user-provided)
- `origin`: Always `null` (practice applies to all cards, regardless of origin)
- These values are fixed to prevent errors and ensure consistency

### Context Structure
- **Required Fields**: `card_count` and `correct_count` are required
- **Validation**: `correct_count` must be <= `card_count` (logical constraint)
- **Future**: Consider adding additional context fields (e.g., `duration`, `difficulty`)

### Use Case
- Called when a practice session ends
- Client tracks `card_count` and `correct_count` during practice
- Sends these statistics to the endpoint when session completes

### Alternative Implementation
- Could use generic `/api/analytics/events` endpoint with:
  ```json
  {
    "event_type": "practice_done",
    "origin": null,
    "context": {
      "card_count": 10,
      "correct_count": 8
    }
  }
  ```
- This endpoint provides a simpler, more focused API for practice completion

### Future Enhancements
- Add optional fields (e.g., `duration`, `session_id`, `difficulty`)
- Support for tracking individual card performance
- Support for tracking practice streaks
- Integration with spaced repetition algorithm (post-MVP)

