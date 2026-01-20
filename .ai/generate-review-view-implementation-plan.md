# View Implementation Plan - Generate/Review View

## 1. Overview

The Generate/Review View is the primary interface for AI flashcard generation from pasted text, proposal review and editing, and manual card creation. This view serves as the default authenticated landing page (`/`) and is the main entry point for card creation workflows. Users can paste English text (up to 10,000 characters), generate AI proposals, edit proposals inline with real-time validation, accept or reject proposals, and create cards manually. The view emphasizes speed to value with immediate feedback, optimistic UI updates, and comprehensive error handling.

## 2. View Routing

**Path:** `/` (root path, default authenticated landing page)

**Access Control:**
- Requires authentication (redirects to `/auth/sign-in` with return URL if unauthenticated)
- Handled by authentication guard middleware

**Layout:**
- Uses `Layout.astro` wrapper
- Desktop: Two-column layout (input area + proposals list)
- Mobile: Single column, stacked layout

## 3. Component Structure

```
GenerateReviewView (Astro page)
├── GenerateReviewContainer (React component - main container)
    ├── TextInputArea (React component)
    │   └── CharacterCounter (React component)
    ├── GenerateButton (React component)
    ├── ErrorBanner (React component)
    ├── LoadingSkeleton (React component)
    ├── ProposalList (React component)
    │   ├── CardProposalEditor (React component) [multiple]
    │   │   ├── CharacterCounter (React component) [2x - front & back]
    │   │   ├── AcceptButton (React component)
    │   │   └── RejectButton (React component)
    │   └── EmptyState (React component)
    └── ManualCardForm (React component)
        ├── CharacterCounter (React component) [2x - front & back]
        └── SaveButton (React component)
```

## 4. Component Details

### GenerateReviewContainer

**Component description:**
Main React container component that orchestrates the entire Generate/Review view. Manages state for text input, pending proposals, loading states, errors, and manual form visibility. Handles API calls for generation, acceptance, and manual creation. Integrates with PendingProposalsProvider for localStorage persistence and AnalyticsProvider for event tracking.

**Main elements:**
- Container div with responsive grid/flex layout
- TextInputArea component
- GenerateButton component
- ErrorBanner component (conditionally rendered)
- LoadingSkeleton component (conditionally rendered during generation)
- ProposalList component
- ManualCardForm component (collapsible/expandable)

**Handled events:**
- `onGenerate`: Triggers AI proposal generation
- `onAcceptProposal`: Accepts a proposal and persists it
- `onRejectProposal`: Removes proposal from pending list
- `onUpdateProposal`: Updates proposal in pending list (inline editing)
- `onCreateManual`: Creates card manually
- `onRetryGeneration`: Retries failed generation
- `onDismissError`: Dismisses error banner

**Handled validation:**
- Text input length validation (≤ 10,000 characters) - disables Generate button
- Authentication state validation - disables Generate button if unauthenticated
- Proposal validation (front ≤ 200, back ≤ 500) - handled by CardProposalEditor
- Manual form validation (front ≤ 200, back ≤ 500) - handled by ManualCardForm

**Types:**
- Uses `GenerateProposalsCommand`, `GenerateProposalsResponse` from `src/types.ts`
- Uses `AcceptProposalCommand`, `AcceptProposalResponse` from `src/types.ts`
- Uses `CreateCardCommand`, `CreateCardResponse` from `src/types.ts`
- Uses `CardProposal` from `src/types.ts`
- Uses `ErrorResponse` from `src/types.ts`
- Custom ViewModel: `PendingProposalViewModel` (extends `CardProposal` with temporary `id`)

**Props:**
- None (top-level container, receives data from hooks and context)

### TextInputArea

**Component description:**
Large textarea component for pasted text input with integrated character counter. Provides real-time feedback on input length and validation state. Supports placeholder text and helper messages.

**Main elements:**
- `textarea` element (large, auto-resize or fixed height with scroll)
- CharacterCounter component (displays current/max characters)
- Helper text element (optional, displays validation messages)
- Label element with ARIA attributes

**Handled events:**
- `onChange`: Updates parent state with input value
- `onPaste`: Handles paste events (sanitization)
- `onFocus`: Manages focus state for accessibility
- `onBlur`: Validates on blur

**Handled validation:**
- Input length validation: `text.length <= 10000`
- Empty input validation: `text.length > 0` (for generation)
- Real-time character count updates

**Types:**
- Props: `{ value: string; onChange: (value: string) => void; disabled?: boolean; error?: string }`
- No DTOs (handles raw string input)

**Props:**
- `value: string` - Current input value
- `onChange: (value: string) => void` - Callback for value changes
- `disabled?: boolean` - Disables textarea
- `error?: string` - Error message to display
- `placeholder?: string` - Placeholder text
- `maxLength: number` - Maximum character limit (default: 10000)

### GenerateButton

**Component description:**
Primary action button for triggering AI proposal generation. Displays loading state during generation, disabled state when input is invalid or user is unauthenticated, and provides visual feedback.

**Main elements:**
- `button` element (Shadcn/ui Button component)
- Loading spinner (conditionally rendered)
- Button text ("Generate" or "Generating...")
- Disabled state styling

**Handled events:**
- `onClick`: Triggers generation API call
- Keyboard: `Enter` key support (when focused)

**Handled validation:**
- Button disabled when: `input.length === 0 || input.length > 10000 || !isAuthenticated || isLoading`
- Disabled state shows inline message: "Input must be 10,000 characters or less" or "Please sign in to generate"

**Types:**
- No DTOs (triggers API call, receives response)
- Uses `GenerateProposalsResponse` for response handling

**Props:**
- `onClick: () => void` - Callback for button click
- `disabled: boolean` - Disables button
- `loading: boolean` - Shows loading state
- `disabledMessage?: string` - Message to show when disabled

### ErrorBanner

**Component description:**
Prominent error display component for generation failures, quota limits, network errors, and invalid JSON responses. Provides retry functionality and user-friendly error messages.

**Main elements:**
- Container div with error styling (red background/border)
- Error icon (optional)
- Error message text
- Retry button (conditionally rendered)
- Dismiss button (optional)

**Handled events:**
- `onRetry`: Retries failed operation
- `onDismiss`: Dismisses error banner

**Handled validation:**
- Error type detection: `QUOTA_EXCEEDED`, `NETWORK_ERROR`, `INVALID_JSON`, `SERVER_ERROR`
- Retry button availability based on error type (not available for quota errors)

**Types:**
- Uses `ErrorResponse` from `src/types.ts`
- Custom type: `ErrorBannerState` with `{ type: string; message: string; retryable: boolean }`

**Props:**
- `error: ErrorBannerState | null` - Error state to display
- `onRetry?: () => void` - Retry callback
- `onDismiss?: () => void` - Dismiss callback

### LoadingSkeleton

**Component description:**
Shimmer effect skeleton component displayed during AI generation to indicate loading state. Maintains layout structure while loading.

**Main elements:**
- Container div with shimmer animation
- Multiple skeleton placeholders (mimics proposal list structure)

**Handled events:**
- None (display-only component)

**Handled validation:**
- None (display-only)

**Types:**
- No DTOs or ViewModels

**Props:**
- `count?: number` - Number of skeleton items to display (default: 3)

### ProposalList

**Component description:**
Scrollable container component that displays pending proposals. Manages list rendering, empty state, and proposal updates. Integrates with PendingProposalsProvider for state management.

**Main elements:**
- Container div with scrollable area
- Multiple CardProposalEditor components (one per proposal)
- EmptyState component (conditionally rendered when list is empty)

**Handled events:**
- `onUpdateProposal`: Updates proposal in list (bubbled from CardProposalEditor)
- `onAcceptProposal`: Accepts proposal (bubbled from CardProposalEditor)
- `onRejectProposal`: Removes proposal from list (bubbled from CardProposalEditor)

**Handled validation:**
- Empty list validation: Shows EmptyState when `proposals.length === 0`
- Proposal validation: Delegated to CardProposalEditor

**Types:**
- Uses `PendingProposalViewModel[]` (array of proposals with temporary IDs)
- Uses `CardProposal` from `src/types.ts` for proposal structure

**Props:**
- `proposals: PendingProposalViewModel[]` - Array of pending proposals
- `onUpdate: (id: string, proposal: CardProposal) => void` - Update callback
- `onAccept: (id: string, proposal: CardProposal) => void` - Accept callback
- `onReject: (id: string) => void` - Reject callback
- `loading?: boolean` - Loading state (shows skeleton)

### CardProposalEditor

**Component description:**
Individual proposal component with inline editing capabilities. Displays editable front/back text fields with real-time character counters, validation feedback, and Accept/Reject actions. Provides color-coded feedback for character limits.

**Main elements:**
- Container div (card-like styling)
- `input` element for front text
- CharacterCounter component for front
- `textarea` element for back text
- CharacterCounter component for back
- AcceptButton component
- RejectButton component
- Inline error messages (conditionally rendered)

**Handled events:**
- `onChangeFront`: Updates front text
- `onChangeBack`: Updates back text
- `onAccept`: Triggers accept action (validates before accepting)
- `onReject`: Triggers reject action (immediate removal)
- Keyboard: `Tab` navigation, `Enter` to accept (when valid)

**Handled validation:**
- Front length: `front.length <= 200` (required, non-empty)
- Back length: `back.length <= 500` (required, non-empty)
- Accept button disabled when: `front.length === 0 || front.length > 200 || back.length === 0 || back.length > 500`
- Real-time validation feedback with color-coded counters

**Types:**
- Uses `CardProposal` from `src/types.ts`
- Uses `PendingProposalViewModel` (extends `CardProposal` with `id: string`)
- Uses `AcceptProposalCommand`, `AcceptProposalResponse` from `src/types.ts`

**Props:**
- `proposal: PendingProposalViewModel` - Proposal to display/edit
- `onUpdate: (id: string, proposal: CardProposal) => void` - Update callback
- `onAccept: (id: string, proposal: CardProposal) => void` - Accept callback
- `onReject: (id: string) => void` - Reject callback
- `accepting?: boolean` - Loading state for accept action

### CharacterCounter

**Component description:**
Reusable character counter component with color-coded feedback. Displays current character count and maximum limit with visual indicators (green/yellow/red thresholds).

**Main elements:**
- `span` element displaying character count
- Color-coded styling based on percentage of limit
- ARIA live region for screen reader announcements

**Handled events:**
- None (display-only, receives count as prop)

**Handled validation:**
- Color thresholds:
  - Green: 0-80% of limit
  - Yellow: 80-95% of limit
  - Red: 95-100% of limit
- Exceeds limit: Red color + error styling

**Types:**
- No DTOs (receives primitive values)

**Props:**
- `current: number` - Current character count
- `max: number` - Maximum character limit
- `label?: string` - Accessible label for screen readers
- `showError?: boolean` - Shows error styling when exceeded

### ManualCardForm

**Component description:**
Form component for manual card creation with the same validation rules as proposal editing. Includes front/back input fields, character counters, and Save button. Can be collapsed/expanded to reduce visual clutter.

**Main elements:**
- Container div (collapsible section)
- Toggle button (expand/collapse)
- `input` element for front text
- CharacterCounter component for front
- `textarea` element for back text
- CharacterCounter component for back
- SaveButton component
- Inline error messages (conditionally rendered)

**Handled events:**
- `onChangeFront`: Updates front text
- `onChangeBack`: Updates back text
- `onSubmit`: Triggers save action (validates before submitting)
- `onToggle`: Expands/collapses form
- Keyboard: `Tab` navigation, `Enter` to submit (when valid)

**Handled validation:**
- Front length: `front.length <= 200` (required, non-empty)
- Back length: `back.length <= 500` (required, non-empty)
- Save button disabled when: `front.length === 0 || front.length > 200 || back.length === 0 || back.length > 500 || saving`
- Real-time validation feedback

**Types:**
- Uses `CreateCardCommand`, `CreateCardResponse` from `src/types.ts`
- Local state: `{ front: string; back: string }`

**Props:**
- `onCreate: (command: CreateCardCommand) => void` - Create callback
- `saving?: boolean` - Loading state for save action
- `collapsed?: boolean` - Initial collapsed state

### EmptyState

**Component description:**
Reusable empty state component with contextual messaging. Displays helpful guidance when no proposals exist, with optional action links.

**Main elements:**
- Container div with centered content
- Icon or illustration (optional)
- Heading text
- Body text with guidance
- Action link/button (optional)

**Handled events:**
- `onAction`: Triggers action (e.g., scroll to input area)

**Handled validation:**
- None (display-only)

**Types:**
- No DTOs

**Props:**
- `title: string` - Heading text
- `message: string` - Body text
- `actionLabel?: string` - Action button text
- `onAction?: () => void` - Action callback
- `icon?: React.ReactNode` - Optional icon

## 5. Types

### Existing Types (from `src/types.ts`)

**CardProposal:**
```typescript
interface CardProposal {
  front: string;
  back: string;
}
```

**GenerateProposalsCommand:**
```typescript
interface GenerateProposalsCommand {
  text: string;
}
```

**GenerateProposalsResponse:**
```typescript
interface GenerateProposalsResponse {
  proposals: CardProposal[];
  count: number;
}
```

**AcceptProposalCommand:**
```typescript
type AcceptProposalCommand = Pick<CardEntity, "front" | "back">;
// Equivalent to: { front: string; back: string }
```

**AcceptProposalResponse:**
```typescript
type AcceptProposalResponse = CardDTO;
// Contains: id, front, back, origin, created_at, updated_at
```

**CreateCardCommand:**
```typescript
type CreateCardCommand = Pick<CardEntity, "front" | "back">;
// Equivalent to: { front: string; back: string }
```

**CreateCardResponse:**
```typescript
type CreateCardResponse = CardDTO;
// Contains: id, front, back, origin, created_at, updated_at
```

**ErrorResponse:**
```typescript
interface ErrorResponse {
  error: {
    code: ErrorCode; // "VALIDATION_ERROR" | "AUTHENTICATION_ERROR" | "NOT_FOUND" | "QUOTA_EXCEEDED" | "SERVER_ERROR"
    message: string;
    details?: Record<string, unknown>;
  };
}
```

### New ViewModel Types

**PendingProposalViewModel:**
```typescript
interface PendingProposalViewModel extends CardProposal {
  id: string; // Temporary client-side UUID for React keys
}
```
- **Purpose:** Extends `CardProposal` with a temporary ID for React list rendering and state management
- **Fields:**
  - `id: string` - Temporary UUID generated client-side (e.g., using `crypto.randomUUID()`)
  - `front: string` - Front text (inherited from `CardProposal`)
  - `back: string` - Back text (inherited from `CardProposal`)
- **Usage:** Used in `ProposalList` and `CardProposalEditor` to track pending proposals before acceptance

**ErrorBannerState:**
```typescript
interface ErrorBannerState {
  type: "QUOTA_EXCEEDED" | "NETWORK_ERROR" | "INVALID_JSON" | "SERVER_ERROR" | "VALIDATION_ERROR";
  message: string;
  retryable: boolean;
  retryCount?: number; // Optional: track retry attempts
}
```
- **Purpose:** Represents error state for the ErrorBanner component
- **Fields:**
  - `type: string` - Error type for conditional rendering and handling
  - `message: string` - User-friendly error message
  - `retryable: boolean` - Whether retry is available (false for quota errors)
  - `retryCount?: number` - Optional retry attempt counter
- **Usage:** Used in `GenerateReviewContainer` to manage error display state

**GenerationState:**
```typescript
interface GenerationState {
  isLoading: boolean;
  error: ErrorBannerState | null;
  retryCount: number; // Track retry attempts (max 2)
}
```
- **Purpose:** Manages AI generation loading and error state
- **Fields:**
  - `isLoading: boolean` - Whether generation is in progress
  - `error: ErrorBannerState | null` - Current error state
  - `retryCount: number` - Number of retry attempts (max 2 per API plan)
- **Usage:** Used in `GenerateReviewContainer` to track generation state

## 6. State Management

### Custom Hooks

**usePendingProposals (from PendingProposalsProvider):**
- **Purpose:** Manages pending proposal state with localStorage persistence
- **Returns:**
  - `proposals: PendingProposalViewModel[]` - Array of pending proposals
  - `addProposals: (proposals: CardProposal[]) => void` - Add new proposals (generates IDs)
  - `updateProposal: (id: string, proposal: CardProposal) => void` - Update existing proposal
  - `removeProposal: (id: string) => void` - Remove proposal from list
  - `clearAll: () => void` - Clear all proposals
- **Implementation:** Syncs to localStorage, generates temporary UUIDs, handles quota errors gracefully

**useAuth (from AuthProvider):**
- **Purpose:** Manages authentication state
- **Returns:**
  - `user: User | null` - Current user object
  - `session: Session | null` - Current session
  - `loading: boolean` - Authentication loading state
  - `isAuthenticated: boolean` - Computed authentication status
- **Implementation:** Uses Supabase Auth client-side, handles token refresh

**useAnalytics (from AnalyticsProvider):**
- **Purpose:** Tracks analytics events
- **Returns:**
  - `trackEvent: (event: TrackEventCommand) => void` - Track event function
- **Implementation:** Queues events for batch sending, handles offline persistence

### Component State (GenerateReviewContainer)

**Text Input State:**
- `textInput: string` - Current text input value
- Managed with `useState<string>("")`

**Generation State:**
- `generationState: GenerationState` - Loading and error state
- Managed with `useState<GenerationState>({ isLoading: false, error: null, retryCount: 0 })`

**Manual Form State:**
- `manualForm: { front: string; back: string }` - Manual form values
- `isManualFormCollapsed: boolean` - Collapsed/expanded state
- Managed with `useState`

**Accept/Reject State:**
- `acceptingIds: Set<string>` - Set of proposal IDs currently being accepted (for loading states)
- Managed with `useState<Set<string>>(new Set())`

**Toast State:**
- Managed by Toast component (Shadcn/ui) or custom toast hook

### State Flow

1. **Initial Load:**
   - Restore pending proposals from `usePendingProposals` hook (reads from localStorage)
   - Check authentication state from `useAuth` hook
   - Initialize empty text input and manual form

2. **Generation Flow:**
   - User pastes text → `textInput` state updates → character counter updates
   - User clicks Generate → `generationState.isLoading = true` → API call
   - On success → `addProposals(response.proposals)` → `generationState.isLoading = false`
   - On error → `generationState.error = errorState` → display ErrorBanner

3. **Proposal Editing Flow:**
   - User edits proposal → `updateProposal(id, updatedProposal)` → localStorage syncs
   - Character counters update in real-time → validation feedback

4. **Accept Flow:**
   - User clicks Accept → `acceptingIds.add(id)` → optimistic UI update (remove from list)
   - API call → On success → `removeProposal(id)` → toast notification → analytics event
   - On failure → rollback optimistic update → restore proposal → display error

5. **Reject Flow:**
   - User clicks Reject → `removeProposal(id)` → immediate removal → async analytics event

6. **Manual Create Flow:**
   - User fills form → `manualForm` state updates → validation feedback
   - User clicks Save → API call → On success → reset form → toast notification → analytics event

## 7. API Integration

### Generate Proposals Endpoint

**Endpoint:** `POST /api/cards/generate`

**Request:**
- **Type:** `GenerateProposalsCommand`
- **Body:**
  ```json
  {
    "text": "string" // Max 10,000 characters
  }
  ```
- **Headers:**
  - `Authorization: Bearer <supabase_jwt_token>` (required)
  - `Content-Type: application/json`

**Response:**
- **Success (200 OK):**
  - **Type:** `GenerateProposalsResponse`
  - **Body:**
    ```json
    {
      "proposals": [
        { "front": "string", "back": "string" }
      ],
      "count": 5
    }
    ```
- **Error Responses:**
  - `400 Bad Request`: Input exceeds 10,000 characters or empty text
  - `401 Unauthorized`: Missing or invalid authentication token
  - `402 Payment Required`: OpenRouter quota/rate limit exceeded
  - `422 Unprocessable Entity`: AI returned invalid JSON or proposals exceeding limits
  - `429 Too Many Requests`: Rate limit exceeded
  - `500 Internal Server Error`: Server error
  - `503 Service Unavailable`: AI service temporarily unavailable
  - **Error Format:** `ErrorResponse`

**Implementation:**
```typescript
async function generateProposals(
  text: string,
  token: string
): Promise<GenerateProposalsResponse> {
  const response = await fetch("/api/cards/generate", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    const error: ErrorResponse = await response.json();
    throw new Error(error.error.message);
  }

  return await response.json();
}
```

**Error Handling:**
- Parse `ErrorResponse` to extract error code and message
- Map error codes to `ErrorBannerState` types
- Retry logic: Up to 2 retries for network errors (not for quota/validation errors)
- Display user-friendly messages based on error code

### Accept Proposal Endpoint

**Endpoint:** `POST /api/cards/accept`

**Request:**
- **Type:** `AcceptProposalCommand`
- **Body:**
  ```json
  {
    "front": "string", // Max 200 characters
    "back": "string"  // Max 500 characters
  }
  ```
- **Headers:**
  - `Authorization: Bearer <supabase_jwt_token>` (required)
  - `Content-Type: application/json`

**Response:**
- **Success (201 Created):**
  - **Type:** `AcceptProposalResponse` (CardDTO)
  - **Body:**
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
- **Error Responses:**
  - `400 Bad Request`: Validation error (character limits exceeded)
  - `401 Unauthorized`: Missing or invalid authentication token
  - `500 Internal Server Error`: Server error
  - **Error Format:** `ErrorResponse`

**Implementation:**
```typescript
async function acceptProposal(
  proposal: CardProposal,
  token: string
): Promise<AcceptProposalResponse> {
  const response = await fetch("/api/cards/accept", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(proposal),
  });

  if (!response.ok) {
    const error: ErrorResponse = await response.json();
    throw new Error(error.error.message);
  }

  return await response.json();
}
```

**Analytics:**
- Automatically creates `accept` event with `origin: "ai"` (handled by API)
- No additional client-side analytics call needed

### Create Card (Manual) Endpoint

**Endpoint:** `POST /api/cards`

**Request:**
- **Type:** `CreateCardCommand`
- **Body:**
  ```json
  {
    "front": "string", // Max 200 characters
    "back": "string"  // Max 500 characters
  }
  ```
- **Headers:**
  - `Authorization: Bearer <supabase_jwt_token>` (required)
  - `Content-Type: application/json`

**Response:**
- **Success (201 Created):**
  - **Type:** `CreateCardResponse` (CardDTO)
  - **Body:**
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
- **Error Responses:**
  - `400 Bad Request`: Validation error (character limits exceeded)
  - `401 Unauthorized`: Missing or invalid authentication token
  - `500 Internal Server Error`: Server error
  - **Error Format:** `ErrorResponse`

**Implementation:**
```typescript
async function createCard(
  command: CreateCardCommand,
  token: string
): Promise<CreateCardResponse> {
  const response = await fetch("/api/cards", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });

  if (!response.ok) {
    const error: ErrorResponse = await response.json();
    throw new Error(error.error.message);
  }

  return await response.json();
}
```

**Analytics:**
- Automatically creates `manual_create` event with `origin: "manual"` (handled by API)
- No additional client-side analytics call needed

### Track Reject Event Endpoint

**Endpoint:** `POST /api/analytics/events`

**Request:**
- **Type:** `TrackEventCommand`
- **Body:**
  ```json
  {
    "event_type": "reject",
    "origin": null,
    "context": {}
  }
  ```
- **Headers:**
  - `Authorization: Bearer <supabase_jwt_token>` (required)
  - `Content-Type: application/json`

**Response:**
- **Success (201 Created):**
  - **Type:** `TrackEventResponse`
- **Error Responses:**
  - `400 Bad Request`: Invalid event type or context
  - `401 Unauthorized`: Missing or invalid authentication token
  - `500 Internal Server Error`: Server error

**Implementation:**
- Called asynchronously after reject action (fire-and-forget)
- Uses `useAnalytics` hook for batch sending
- Silent failure handling (does not block user flow)

## 8. User Interactions

### Text Input Interaction

**Action:** User pastes or types text into TextInputArea

**Flow:**
1. User inputs text → `onChange` event fires
2. `textInput` state updates → character counter updates in real-time
3. Generate button enabled/disabled based on validation:
   - Enabled: `textInput.length > 0 && textInput.length <= 10000 && isAuthenticated`
   - Disabled: Shows inline message if limit exceeded or unauthenticated

**Outcome:**
- Real-time character counter feedback
- Generate button state updates
- Validation messages displayed (if applicable)

### Generate Proposals Interaction

**Action:** User clicks Generate button

**Flow:**
1. Validation check: `textInput.length > 0 && textInput.length <= 10000 && isAuthenticated`
2. If valid:
   - Generate button shows loading state
   - `generationState.isLoading = true`
   - LoadingSkeleton displayed
   - API call: `POST /api/cards/generate`
3. On success:
   - `addProposals(response.proposals)` → generates temporary IDs
   - Proposals appear in ProposalList
   - LoadingSkeleton hidden
   - `generationState.isLoading = false`
   - Text input cleared (optional) or preserved
   - Analytics event `generate` created automatically by API
4. On error:
   - ErrorBanner displayed with error message
   - `generationState.error = errorState`
   - Retry button available (if retryable)
   - LoadingSkeleton hidden

**Outcome:**
- Proposals displayed in list (success)
- Error message displayed with retry option (failure)
- Loading state provides feedback during generation

### Edit Proposal Interaction

**Action:** User edits front or back text in CardProposalEditor

**Flow:**
1. User types in input/textarea → `onChange` event fires
2. Character counter updates in real-time with color-coded feedback
3. `updateProposal(id, updatedProposal)` called
4. Proposal updated in pending list → localStorage syncs
5. Accept button enabled/disabled based on validation:
   - Enabled: `front.length > 0 && front.length <= 200 && back.length > 0 && back.length <= 500`
   - Disabled: Shows validation errors if limits exceeded

**Outcome:**
- Real-time character counter feedback (green/yellow/red)
- Accept button state updates
- Validation errors displayed inline (if applicable)
- Changes persisted to localStorage

### Accept Proposal Interaction

**Action:** User clicks Accept button on valid proposal

**Flow:**
1. Validation check: `front.length > 0 && front.length <= 200 && back.length > 0 && back.length <= 500`
2. If valid:
   - Optimistic UI update: Proposal removed from list immediately
   - `acceptingIds.add(id)` → loading state on Accept button
   - API call: `POST /api/cards/accept`
3. On success:
   - Toast notification: "Card saved successfully"
   - `removeProposal(id)` → removes from pending list
   - `acceptingIds.delete(id)` → loading state removed
   - Analytics event `accept` created automatically by API
4. On failure:
   - Rollback optimistic update: Proposal restored to list
   - Error message displayed (toast or inline)
   - `acceptingIds.delete(id)` → loading state removed

**Outcome:**
- Card persisted to database (success)
- Proposal removed from pending list
- Success feedback via toast notification
- Error handling with rollback (failure)

### Reject Proposal Interaction

**Action:** User clicks Reject button

**Flow:**
1. Proposal removed from list immediately (no API call)
2. `removeProposal(id)` → updates pending list → localStorage syncs
3. Async analytics event: `trackEvent({ event_type: "reject", origin: null, context: {} })`
4. Analytics event queued for batch sending (fire-and-forget)

**Outcome:**
- Proposal removed from list immediately
- No persistence occurs
- Analytics event tracked asynchronously

### Manual Card Creation Interaction

**Action:** User fills manual form and clicks Save

**Flow:**
1. User inputs front/back text → `manualForm` state updates
2. Character counters update in real-time
3. Save button enabled/disabled based on validation:
   - Enabled: `front.length > 0 && front.length <= 200 && back.length > 0 && back.length <= 500 && !saving`
   - Disabled: Shows validation errors if limits exceeded
4. User clicks Save:
   - Validation check passes
   - Save button shows loading state
   - API call: `POST /api/cards`
5. On success:
   - Toast notification: "Card created successfully"
   - Form reset: `manualForm = { front: "", back: "" }`
   - Analytics event `manual_create` created automatically by API
6. On failure:
   - Error message displayed (toast or inline)
   - Form data preserved for user to retry

**Outcome:**
- Card persisted to database (success)
- Form reset for next creation
- Success feedback via toast notification
- Error handling with preserved form data (failure)

### Retry Generation Interaction

**Action:** User clicks Retry button in ErrorBanner

**Flow:**
1. Check retry count: `generationState.retryCount < 2`
2. If retryable:
   - `generationState.retryCount++`
   - ErrorBanner hidden
   - Generate flow restarted (same text input)
3. If max retries reached:
   - Retry button disabled
   - Message: "Maximum retry attempts reached. Please try again later."

**Outcome:**
- Generation retried (if retryable)
- Retry count tracked
- User-friendly message when max retries reached

## 9. Conditions and Validation

### Text Input Validation

**Component:** TextInputArea

**Conditions:**
- **Length Check:** `textInput.length <= 10000`
  - **When:** Real-time during typing/pasting
  - **Effect:** Generate button disabled if exceeded, inline message displayed
  - **Message:** "Input must be 10,000 characters or less"
- **Empty Check:** `textInput.length > 0`
  - **When:** Before generation
  - **Effect:** Generate button disabled if empty
  - **Message:** None (button simply disabled)

**Visual Feedback:**
- Character counter displays: `{current} / 10,000`
- Generate button disabled state with tooltip/message
- Inline error message below textarea (if limit exceeded)

### Authentication Validation

**Component:** GenerateButton

**Conditions:**
- **Authentication Check:** `isAuthenticated === true`
  - **When:** Before generation, real-time based on auth state
  - **Effect:** Generate button disabled if unauthenticated
  - **Message:** "Please sign in to generate" (redirects to sign-in)

**Visual Feedback:**
- Generate button disabled state
- Tooltip or inline message indicating authentication required

### Proposal Validation

**Component:** CardProposalEditor

**Conditions:**
- **Front Length:** `front.length > 0 && front.length <= 200`
  - **When:** Real-time during editing
  - **Effect:** Accept button disabled if invalid, character counter shows error
  - **Message:** "Front must be 200 characters or less" (if exceeded)
- **Back Length:** `back.length > 0 && back.length <= 500`
  - **When:** Real-time during editing
  - **Effect:** Accept button disabled if invalid, character counter shows error
  - **Message:** "Back must be 500 characters or less" (if exceeded)
- **Combined Validation:** Both front and back must be valid
  - **When:** Before accepting
  - **Effect:** Accept button disabled until both valid
  - **Message:** Combined error messages if both invalid

**Visual Feedback:**
- Character counters with color-coded feedback:
  - Green: 0-80% of limit
  - Yellow: 80-95% of limit
  - Red: 95-100% of limit
- Inline error messages below inputs
- Accept button disabled state with tooltip

### Manual Form Validation

**Component:** ManualCardForm

**Conditions:**
- **Front Length:** `front.length > 0 && front.length <= 200`
  - **When:** Real-time during editing
  - **Effect:** Save button disabled if invalid, character counter shows error
  - **Message:** "Front must be 200 characters or less" (if exceeded)
- **Back Length:** `back.length > 0 && back.length <= 500`
  - **When:** Real-time during editing
  - **Effect:** Save button disabled if invalid, character counter shows error
  - **Message:** "Back must be 500 characters or less" (if exceeded)
- **Combined Validation:** Both front and back must be valid
  - **When:** Before saving
  - **Effect:** Save button disabled until both valid
  - **Message:** Combined error messages if both invalid

**Visual Feedback:**
- Same as proposal validation (character counters, inline errors, button state)

### Server-Side Validation

**API Endpoints:** All card creation/acceptance endpoints

**Conditions:**
- **Character Limits:** Enforced by database CHECK constraints and Zod validation
- **Required Fields:** Enforced by Zod validation
- **Response:** `400 Bad Request` with `ErrorResponse` format

**Client Handling:**
- Parse `ErrorResponse` to extract validation errors
- Display field-specific error messages
- Highlight invalid fields
- Preserve user input for correction

## 10. Error Handling

### Generation Errors

**Quota Exceeded (402 Payment Required):**
- **Detection:** Error code `QUOTA_EXCEEDED` in `ErrorResponse`
- **Handling:**
  - Display ErrorBanner with message: "Generation unavailable due to quota limits. Please try again later or create cards manually."
  - Disable Generate button temporarily (prevent rapid retries)
  - Show link to manual creation form
  - Retry button not available (not retryable)
- **User Action:** Use manual creation or wait and retry later

**Invalid JSON (422 Unprocessable Entity):**
- **Detection:** Error code in `ErrorResponse` or JSON parse failure
- **Handling:**
  - Display ErrorBanner with message: "AI returned invalid response. Please try again."
  - Retry button available (retryable, max 2 attempts)
  - Track retry count in `generationState.retryCount`
- **User Action:** Click Retry (up to 2 times) or use manual creation

**Network Error:**
- **Detection:** Fetch failure or timeout
- **Handling:**
  - Display ErrorBanner with message: "Connection error. Please check your internet and try again."
  - Retry button available with exponential backoff
  - Track retry attempts
- **User Action:** Click Retry or check internet connection

**Rate Limit (429 Too Many Requests):**
- **Detection:** HTTP status 429
- **Handling:**
  - Display ErrorBanner with message: "Too many requests. Please wait a moment and try again."
  - Retry button available after delay (show countdown if possible)
- **User Action:** Wait and retry

**Server Error (500 Internal Server Error):**
- **Detection:** HTTP status 500
- **Handling:**
  - Display ErrorBanner with message: "Server error. Please try again later."
  - Retry button available (retryable)
- **User Action:** Click Retry or contact support

### Accept/Reject Errors

**Validation Error (400 Bad Request):**
- **Detection:** Error code `VALIDATION_ERROR` in `ErrorResponse`
- **Handling:**
  - Rollback optimistic UI update
  - Display inline error messages in CardProposalEditor
  - Highlight invalid fields
  - Preserve user edits for correction
- **User Action:** Correct validation errors and retry

**Network Error:**
- **Detection:** Fetch failure
- **Handling:**
  - Rollback optimistic UI update
  - Display toast notification: "Failed to save card. Please try again."
  - Restore proposal to list
- **User Action:** Retry accept action

**Authentication Error (401 Unauthorized):**
- **Detection:** HTTP status 401
- **Handling:**
  - Redirect to sign-in with return URL
  - Preserve pending proposals in localStorage
  - Restore proposals after re-authentication
- **User Action:** Sign in and return to view

### Manual Creation Errors

**Validation Error (400 Bad Request):**
- **Detection:** Error code `VALIDATION_ERROR` in `ErrorResponse`
- **Handling:**
  - Display inline error messages in ManualCardForm
  - Highlight invalid fields
  - Preserve form data
- **User Action:** Correct validation errors and retry

**Network Error:**
- **Detection:** Fetch failure
- **Handling:**
  - Display toast notification: "Failed to create card. Please try again."
  - Preserve form data
- **User Action:** Retry save action

### LocalStorage Errors

**Quota Exceeded:**
- **Detection:** `QuotaExceededError` when writing to localStorage
- **Handling:**
  - Fallback to in-memory state only
  - Display toast notification: "Unable to save proposals locally. Proposals will be lost on page refresh."
  - Provide "Clear all proposals" option to free space
- **User Action:** Clear proposals or continue with in-memory state

**Corrupted Data:**
- **Detection:** JSON parse failure when reading from localStorage
- **Handling:**
  - Silent recovery: Clear corrupted data, fallback to empty state
  - Log error for debugging
  - User can regenerate proposals
- **User Action:** Regenerate proposals if needed

### Error Recovery Strategies

1. **Optimistic UI Rollback:** All accept/create actions use optimistic updates with rollback on failure
2. **Retry Logic:** Generation errors support retry (max 2 attempts) with exponential backoff
3. **State Preservation:** Form data and proposals preserved on errors for user correction
4. **Graceful Degradation:** LocalStorage errors fallback to in-memory state
5. **User Guidance:** Clear error messages with actionable next steps

## 11. Implementation Steps

1. **Set up project structure:**
   - Create `src/components/GenerateReview/` directory
   - Create component files: `GenerateReviewContainer.tsx`, `TextInputArea.tsx`, `GenerateButton.tsx`, `ErrorBanner.tsx`, `LoadingSkeleton.tsx`, `ProposalList.tsx`, `CardProposalEditor.tsx`, `CharacterCounter.tsx`, `ManualCardForm.tsx`, `EmptyState.tsx`
   - Create `src/components/hooks/` directory for custom hooks (if not exists)
   - Create `src/lib/utils/` for utility functions (sanitization, etc.)

2. **Implement type definitions:**
   - Add `PendingProposalViewModel` interface to `src/types.ts` or create `src/types/view-models.ts`
   - Add `ErrorBannerState` interface
   - Add `GenerationState` interface
   - Export types for component usage

3. **Implement CharacterCounter component:**
   - Create `CharacterCounter.tsx` with color-coded feedback
   - Implement thresholds: green (0-80%), yellow (80-95%), red (95-100%)
   - Add ARIA live region for screen readers
   - Test with various character counts

4. **Implement TextInputArea component:**
   - Create `TextInputArea.tsx` with large textarea
   - Integrate CharacterCounter component
   - Add validation logic (max 10,000 characters)
   - Implement input sanitization
   - Add ARIA labels and accessibility attributes
   - Test with paste events and long text

5. **Implement GenerateButton component:**
   - Create `GenerateButton.tsx` using Shadcn/ui Button
   - Add loading state with spinner
   - Implement disabled state with tooltip/message
   - Add keyboard support (Enter key)
   - Test disabled states and loading state

6. **Implement ErrorBanner component:**
   - Create `ErrorBanner.tsx` with error styling
   - Add retry button (conditionally rendered)
   - Add dismiss button (optional)
   - Implement error type detection and messaging
   - Test with various error types

7. **Implement LoadingSkeleton component:**
   - Create `LoadingSkeleton.tsx` with shimmer animation
   - Design skeleton structure matching proposal list
   - Add configurable count prop
   - Test loading state display

8. **Implement EmptyState component:**
   - Create `EmptyState.tsx` with centered layout
   - Add title, message, and optional action props
   - Add optional icon support
   - Test empty state display

9. **Implement CardProposalEditor component:**
   - Create `CardProposalEditor.tsx` with card-like styling
   - Add front input and back textarea with CharacterCounter
   - Implement real-time validation
   - Add Accept and Reject buttons
   - Implement loading state for Accept action
   - Add keyboard navigation support
   - Test editing, validation, and actions

10. **Implement ProposalList component:**
    - Create `ProposalList.tsx` with scrollable container
    - Map proposals to CardProposalEditor components
    - Integrate EmptyState for empty list
    - Handle update, accept, and reject callbacks
    - Test list rendering and empty state

11. **Implement ManualCardForm component:**
    - Create `ManualCardForm.tsx` with collapsible section
    - Add front input and back textarea with CharacterCounter
    - Implement same validation as CardProposalEditor
    - Add Save button with loading state
    - Add toggle button for collapse/expand
    - Test form validation and submission

12. **Create PendingProposalsProvider:**
    - Create `src/components/providers/PendingProposalsProvider.tsx`
    - Implement `usePendingProposals` hook
    - Add localStorage sync with error handling
    - Generate temporary UUIDs for proposals
    - Handle quota exceeded errors gracefully
    - Test persistence across refreshes

13. **Create AuthProvider (if not exists):**
    - Create `src/components/providers/AuthProvider.tsx`
    - Implement `useAuth` hook with Supabase Auth
    - Handle token refresh automatically
    - Provide authentication state to components
    - Test authentication flow

14. **Create AnalyticsProvider (if not exists):**
    - Create `src/components/providers/AnalyticsProvider.tsx`
    - Implement `useAnalytics` hook
    - Add event queuing and batch sending
    - Handle offline persistence
    - Test event tracking

15. **Implement GenerateReviewContainer component:**
    - Create `GenerateReviewContainer.tsx` as main container
    - Integrate all child components
    - Implement state management (text input, generation state, manual form)
    - Implement API integration functions (generate, accept, create)
    - Add error handling and retry logic
    - Integrate with PendingProposalsProvider, AuthProvider, AnalyticsProvider
    - Implement optimistic UI updates for accept actions
    - Add toast notifications (using Shadcn/ui Toast or custom)
    - Test complete user flows

16. **Create Astro page:**
    - Update `src/pages/index.astro`
    - Import GenerateReviewContainer component
    - Wrap with Layout component
    - Add client-side hydration directive
    - Test page rendering

17. **Implement API client utilities:**
   - Create `src/lib/api/cards.ts` for card API functions
   - Create `src/lib/api/analytics.ts` for analytics API functions
   - Implement fetch wrappers with error handling
   - Add token extraction from auth context
   - Test API calls

18. **Implement input sanitization:**
   - Create `src/lib/utils/sanitize.ts`
   - Implement HTML/JavaScript escaping
   - Add XSS prevention utilities
   - Test sanitization with various inputs

19. **Add responsive styling:**
   - Implement desktop two-column layout (≥768px)
   - Implement mobile single-column layout (<768px)
   - Add Tailwind responsive classes
   - Test on various screen sizes

20. **Add accessibility features:**
   - Add ARIA labels to all interactive elements
   - Implement keyboard navigation
   - Add focus management for dynamic content
   - Test with screen readers
   - Verify color contrast (WCAG AA)

21. **Implement error boundary:**
   - Create `ErrorBoundary.tsx` component
   - Wrap GenerateReviewContainer with ErrorBoundary
   - Add error logging (without sensitive data)
   - Test error boundary with intentional errors

22. **Add integration tests:**
   - Test complete generation flow
   - Test proposal editing and acceptance
   - Test manual card creation
   - Test error scenarios
   - Test localStorage persistence
   - Test authentication flow

23. **Performance optimization:**
   - Add React.memo() to expensive components
   - Implement useCallback for event handlers
   - Add useMemo for computed values
   - Optimize re-renders
   - Test performance with large proposal lists

24. **Final polish:**
   - Add loading states to all async operations
   - Verify toast notifications work correctly
   - Test error messages are user-friendly
   - Verify all validation feedback is clear
   - Test responsive design on real devices
   - Verify accessibility compliance

