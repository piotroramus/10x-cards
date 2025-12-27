# API Endpoint Implementation Plan: Accept Proposal (POST /api/cards/accept)

## 1. Endpoint Overview

The Accept Proposal endpoint allows users to accept an AI-generated card proposal and persist it as a card. The endpoint automatically sets the `origin` field to `'ai'` and creates an analytics event `accept` to track the action. This endpoint is used when a user accepts a proposal after optional client-side editing.

**Purpose**: Persist AI-generated card proposals that users have reviewed and accepted.

**Business Value**: Enables the AI generation workflow by allowing users to save AI-generated cards to their collection.

## 2. Request Details

- **HTTP Method**: `POST`
- **URL Structure**: `/api/cards/accept`
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
- `AcceptProposalCommand` (from `src/types.ts`):
  ```typescript
  {
    front: string;
    back: string;
  }
  ```

### Response Types
- `AcceptProposalResponse` (from `src/types.ts`), which is `CardDTO`:
  ```typescript
  {
    id: string;
    front: string;
    back: string;
    origin: "ai";
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
  "origin": "ai",
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

1. **Request Reception**: Astro API route handler receives POST request at `/api/cards/accept`
2. **Authentication**: Extract and validate JWT token from `Authorization` header
3. **User Identification**: Extract `user_id` from validated JWT token claims
4. **Request Body Validation**: Parse and validate JSON body using Zod schema:
   - `front`: Required, non-empty string, max 200 characters
   - `back`: Required, non-empty string, max 500 characters
5. **Service Layer Call**: Call `CardService.acceptProposal(command, userId)`
6. **Database Insert**: Service constructs Supabase insert:
   - Set `user_id` from authenticated user
   - Set `origin = 'ai'`
   - Set `front` and `back` from validated input
   - Database generates `id` (UUID) and timestamps (`created_at`, `updated_at`)
7. **Analytics Event Creation**: Service creates analytics event:
   - `event_type = 'accept'`
   - `origin = 'ai'`
   - `context = {}` or `{"card_id": cardId}` (optional)
8. **Data Transformation**: Service maps database row to `CardDTO` format
9. **Response Construction**: Build `AcceptProposalResponse` with created card
10. **Response Return**: Return JSON response with `201 Created` status

### Database Interaction Details

- **Table**: `cards`
- **RLS Policy**: `cards_insert_own` enforces `auth.uid() = user_id`
- **Insert Pattern**: Same as Create Card endpoint, but with `origin = 'ai'`

### Analytics Event Creation

- **Table**: `analytics_events`
- **Insert Pattern**:
  ```typescript
  await supabase
    .from('analytics_events')
    .insert({
      user_id: userId,
      event_type: 'accept',
      origin: 'ai',
      context: { card_id: card.id } // optional
    });
  ```

## 6. Security Considerations

### Authentication
- Same as Create Card endpoint

### Authorization
- Same as Create Card endpoint

### Input Validation
- Same as Create Card endpoint (character limits, required fields, XSS prevention)

### Data Exposure
- Same as Create Card endpoint

## 7. Error Handling

### Error Scenarios and Status Codes

Same as Create Card endpoint:
- **401 Unauthorized**: Authentication errors
- **400 Bad Request**: Validation errors
- **500 Internal Server Error**: Database errors

### Error Response Format
Same as Create Card endpoint.

### Error Logging Strategy
Same as Create Card endpoint.

## 8. Performance Considerations

Same as Create Card endpoint:
- Efficient single row insert
- Non-blocking analytics event creation
- No significant bottlenecks

## 9. Implementation Steps

### Step 1: Reuse Validation Schema
1. Reuse `createCardSchema` from `src/lib/validations/cards.ts` (same validation rules)

### Step 2: Update Card Service
1. Update `src/lib/services/card.service.ts`:
   - Function `acceptProposal(command: AcceptProposalCommand, userId: string)`: 
     - Similar to `createCard()` but sets `origin = 'ai'`
     - Creates analytics event `accept` with `origin = 'ai'`
     - Returns `CardDTO`

### Step 3: Create API Route Handler
1. Create `src/pages/api/cards/accept.ts`:
   - Export `export const prerender = false;`
   - Implement `POST` handler:
     - Extract and validate authentication
     - Parse and validate request body using same Zod schema as Create Card
     - Call `CardService.acceptProposal(command, userId)`
     - Return JSON response with `201 Created` status
   - Implement error handling (same as Create Card)

### Step 4: Code Review Checklist
- [ ] Same checklist as Create Card endpoint
- [ ] `origin` is automatically set to `'ai'` (not `'manual'`)
- [ ] Analytics event uses `event_type = 'accept'` and `origin = 'ai'`

## 10. Additional Notes

### Similarity to Create Card
This endpoint is nearly identical to the Create Card endpoint, with the following differences:
- Sets `origin = 'ai'` instead of `origin = 'manual'`
- Creates analytics event `accept` instead of `manual_create`
- Semantically different (accepts AI proposal vs. manual creation)

### Code Reusability
Consider extracting common logic between Create Card and Accept Proposal:
- Shared validation schema
- Shared service method with `origin` parameter
- Shared error handling

### Origin Field
- `origin` field is automatically set to `'ai'` for this endpoint
- This distinguishes AI-generated cards from manually created cards
- Users cannot override the `origin` field

