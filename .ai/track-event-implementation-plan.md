# API Endpoint Implementation Plan: Track Analytics Event (POST /api/analytics/events)

## 1. Endpoint Overview

The Track Analytics Event endpoint creates an analytics event to track user actions. This endpoint is primarily called by the application to track user actions. Events are automatically created by other endpoints (e.g., `accept`, `manual_create`, `practice_done`), but this endpoint allows explicit event tracking when needed (e.g., client-side `reject` actions).

**Purpose**: Provide a flexible way to track analytics events, especially for client-side actions that don't have dedicated endpoints.

**Business Value**: Enables comprehensive analytics tracking across the application, supporting KPI measurement and user behavior analysis.

## 2. Request Details

- **HTTP Method**: `POST`
- **URL Structure**: `/api/analytics/events`
- **Parameters**: None
- **Request Headers**:
  - `Authorization: Bearer <supabase_jwt_token>` (required)
  - `Content-Type: application/json` (required)
- **Request Body**:
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

## 3. Used Types

### Request Types
- `TrackEventCommand` (from `src/types.ts`):
  ```typescript
  {
    event_type: EventType;
    origin: AnalyticsOrigin;
    context?: AnalyticsEventContext;
  }
  ```

### Response Types
- `TrackEventResponse` (from `src/types.ts`):
  ```typescript
  {
    id: string;
    event_type: EventType;
    origin: AnalyticsOrigin;
    context: Json | null;
    created_at: string;
  }
  ```

### Error Response Type
- `ErrorResponse` (from `src/types.ts`)

## 4. Response Details

### Success Response (201 Created)
```json
{
  "id": "uuid",
  "event_type": "string",
  "origin": "ai" | "manual" | null,
  "context": {},
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
      "event_type": "Invalid event type",
      "origin": "Invalid origin for event type",
      "context": "Missing required context fields"
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

1. **Request Reception**: Astro API route handler receives POST request at `/api/analytics/events`
2. **Authentication**: Extract and validate JWT token from `Authorization` header
3. **User Identification**: Extract `user_id` from validated JWT token claims
4. **Request Body Validation**: Parse and validate JSON body using Zod schema:
   - `event_type`: Required, must be one of allowed values
   - `origin`: Required, must be valid for event type
   - `context`: Optional, but must include required fields for specific event types
5. **Service Layer Call**: Call `AnalyticsService.trackEvent(command, userId)`
6. **Database Insert**: Service constructs Supabase insert:
   - Set `user_id` from authenticated user
   - Set `event_type`, `origin`, and `context` from validated input
   - Database generates `id` (UUID) and `created_at` timestamp
7. **Data Transformation**: Service maps database row to `TrackEventResponse` format (excludes `user_id`)
8. **Response Construction**: Build `TrackEventResponse` with created event
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
      event_type: command.event_type,
      origin: command.origin,
      context: command.context || null
    })
    .select('id, event_type, origin, context, created_at')
    .single();
  ```

### Validation Rules

- **event_type**: Must be one of: `'generate'`, `'accept'`, `'reject'`, `'manual_create'`, `'practice_done'`
- **origin** validation by event type:
  - `generate`: `origin = null`
  - `accept`: `origin = 'ai'`
  - `reject`: `origin = null`
  - `manual_create`: `origin = 'manual'`
  - `practice_done`: `origin = null` (or `'ai'`/`'manual'` if needed)
- **context** validation by event type:
  - `generate`: `{}` (empty or minimal)
  - `accept`: `{}` or `{"card_id": "uuid"}` (optional)
  - `reject`: `{}` (empty)
  - `manual_create`: `{}` or `{"card_id": "uuid"}` (optional)
  - `practice_done`: `{"card_count": number, "correct_count": number}` (required)

## 6. Security Considerations

### Authentication
- Same as Create Card endpoint

### Authorization
- **Row Level Security (RLS)**: Primary authorization mechanism
- **RLS Policy**: `analytics_events_insert_own` ensures users can only create events for themselves
- **User ID Enforcement**: Set `user_id` from JWT token (never trust client-provided `user_id`)

### Input Validation
- **Event Type Validation**: Validate against allowed enum values
- **Origin Validation**: Validate origin matches event type requirements
- **Context Validation**: Validate context structure based on event type
- **Privacy**: Never allow raw source text in context (enforced by validation)
- **SQL Injection Prevention**: Supabase client uses parameterized queries automatically

### Data Exposure
- **DTO Filtering**: Exclude `user_id` from response
- **Privacy**: Never store raw source text in context

## 7. Error Handling

### Error Scenarios and Status Codes

#### 1. Authentication Errors (401 Unauthorized)
- Same as Create Card endpoint

#### 2. Validation Errors (400 Bad Request)
- **Scenario**: Missing `event_type` field
- **Scenario**: Invalid `event_type` value (not in allowed enum)
- **Scenario**: Invalid `origin` value for event type
- **Scenario**: Missing required `context` fields for `practice_done` events
- **Scenario**: Invalid `context` structure
- **Scenario**: Invalid data types
- **Handling**: Return `400` with `VALIDATION_ERROR` code and detailed field-level error messages
- **Logging**: Log validation errors with field names (sanitize context data)

#### 3. Database Errors (500 Internal Server Error)
- **Scenario**: Database connection failure
- **Scenario**: Insert operation failure
- **Scenario**: CHECK constraint violation (should be caught by validation)
- **Handling**: Return `500` with `SERVER_ERROR` code
- **Logging**: Log full error details server-side (with error ID)

### Error Response Format
All errors follow the `ErrorResponse` type structure.

### Error Logging Strategy
- **Authentication Errors**: Log at WARN level
- **Validation Errors**: Log at INFO level (expected user errors)
- **Database Errors**: Log at ERROR level with full stack trace
- **Never Log**: Full context data (may contain sensitive information)

## 8. Performance Considerations

### Database Optimization
- **Index Utilization**: Indexes on `event_type`, `user_id`, and `created_at` support efficient queries
- **RLS Overhead**: RLS policies add minimal overhead
- **JSONB Context**: JSONB field is efficient for flexible context storage

### Query Performance
- **Single Insert**: Efficient single row insert operation
- **No Complex Queries**: Simple insert operation, no joins or aggregations

### Potential Bottlenecks
- **None Identified**: Simple insert operations are highly optimized

### Retention Policy
- **90-Day Retention**: Analytics events older than 90 days should be deleted (handled by scheduled job)
- **Index Support**: Index on `created_at` supports efficient cleanup queries

## 9. Implementation Steps

### Step 1: Create Validation Schema
1. Create `src/lib/validations/analytics.ts`:
   - Define Zod schema for `TrackEventCommand`:
     ```typescript
     const eventTypeSchema = z.enum(['generate', 'accept', 'reject', 'manual_create', 'practice_done']);
     const originSchema = z.enum(['ai', 'manual']).nullable();
     
     const trackEventSchema = z.object({
       event_type: eventTypeSchema,
       origin: originSchema,
       context: z.record(z.unknown()).optional(),
     }).refine((data) => {
       // Validate origin matches event type
       if (data.event_type === 'generate' || data.event_type === 'reject') {
         return data.origin === null;
       }
       if (data.event_type === 'accept') {
         return data.origin === 'ai';
       }
       if (data.event_type === 'manual_create') {
         return data.origin === 'manual';
       }
       // practice_done can have null or 'ai'/'manual'
       return true;
     }, {
       message: "Origin does not match event type requirements"
     }).refine((data) => {
       // Validate context for practice_done
       if (data.event_type === 'practice_done') {
         if (!data.context || typeof data.context !== 'object') {
           return false;
         }
         const ctx = data.context as Record<string, unknown>;
         return typeof ctx.card_count === 'number' && typeof ctx.correct_count === 'number';
       }
       return true;
     }, {
       message: "practice_done events require card_count and correct_count in context"
     });
     ```

### Step 2: Create Analytics Service
1. Create `src/lib/services/analytics.service.ts`:
   - Function `trackEvent(command: TrackEventCommand, userId: string)`: 
     - Parameters: `command` (validated), `userId` (from JWT)
     - Constructs Supabase insert with `user_id` and validated fields
     - Inserts event into database
     - Returns `TrackEventResponse`
     - Handle database errors and transform to service-level errors
     - Map database row to `TrackEventResponse` (exclude `user_id`)

### Step 3: Create API Route Handler
1. Create `src/pages/api/analytics/events.ts`:
   - Export `export const prerender = false;`
   - Implement `POST` handler:
     - Extract and validate authentication
     - Parse and validate request body using Zod schema
     - Call `AnalyticsService.trackEvent(command, userId)`
     - Return JSON response with `201 Created` status
   - Implement error handling:
     - Catch authentication errors → return `401`
     - Catch validation errors → return `400` with field-level details
     - Catch service/database errors → return `500`
     - Use consistent `ErrorResponse` format

### Step 4: Code Review Checklist
- [ ] Authentication is properly validated
- [ ] Request body is validated with Zod (event_type, origin, context)
- [ ] Origin validation matches event type requirements
- [ ] Context validation for practice_done events
- [ ] RLS policies are respected
- [ ] `user_id` is set from JWT token (never from client)
- [ ] Error responses follow `ErrorResponse` format
- [ ] `user_id` is excluded from response
- [ ] Privacy: No raw source text in context
- [ ] TypeScript types are correctly used throughout

## 10. Additional Notes

### Event Type and Origin Rules
- **generate**: `origin = null` (no card created yet)
- **accept**: `origin = 'ai'` (accepting AI proposal)
- **reject**: `origin = null` (rejecting AI proposal, no card created)
- **manual_create**: `origin = 'manual'` (manually created card)
- **practice_done**: `origin = null` (or `'ai'`/`'manual'` if tracking card origin)

### Context Structure
- **Flexible JSONB**: Context is stored as JSONB for flexibility
- **Event-Specific**: Context structure varies by event type
- **Privacy**: Never include raw source text in context

### Automatic Event Creation
- Other endpoints automatically create analytics events:
  - `POST /api/cards` → `manual_create` event
  - `POST /api/cards/accept` → `accept` event
  - `POST /api/cards/generate` → `generate` event
- This endpoint allows explicit tracking for client-side actions (e.g., `reject`)

### Use Cases
- **Client-Side Reject**: Track when user rejects an AI proposal
- **Custom Events**: Track custom user actions not covered by other endpoints
- **Explicit Tracking**: Provide explicit control over event tracking

### Future Enhancements
- Add more event types as needed
- Support for custom context structures
- Event batching (multiple events in one request)
- Event validation rules as configuration

