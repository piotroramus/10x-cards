# Product Requirements Document (PRD) - Lang Memo

## 1. Product Overview

Lang Memo is a web application that reduces the friction of creating effective study flashcards by using AI to generate high-quality card proposals from pasted English text. Users can edit, accept, or reject proposals, create cards manually, and practice them with a simple session flow. The MVP focuses on speed to value, minimal UX, and measurable quality while deferring advanced spaced-repetition scheduling.

Audience
- Individual learners who study factual or conceptual material and are motivated to use flashcards.
- Early adopters comfortable with an English-only interface and content during MVP.

Problem-solution fit
- Problem: Manually authoring good flashcards takes time and reduces adoption of spaced repetition.
- Solution: AI proposes concise, valid flashcards from pasted text; users edit and accept only what they want to keep.

Guiding principles
- Keep user flow simple: paste → generate → review/edit → accept/reject → practice.
- Enforce strict quality and length constraints for consistency and usability.
- Persist only explicit user-accepted content; do not store raw source text.
- Require authentication for all usage; no anonymous access.

Technical overview (MVP)
- Web app (desktop-first, responsive) with a single default collection of cards.
- AI generation via OpenRouter using a budget model with server-side schema validation.
- Authentication via email/password with email verification (Supabase). Sign-in is required to access the app; all actions require authentication. A middleware authentication guard automatically redirects unauthenticated users to the sign-in page.
- Persistence in a managed database (e.g., Supabase). Pending items live only on the client until acceptance.

## 2. User Problem

Manual creation of high-quality flashcards is time-consuming and interrupts study flow. Learners either give up or create inconsistent cards, undermining spaced repetition’s benefits. A fast, reliable way to transform study text into concise cards—while keeping the user in control—will increase creation volume and quality, leading to more practice and better retention.

User goals
- Quickly turn source material into usable flashcards.
- Remain in control over wording and accuracy by editing before saving.
- Keep cards organized without heavy setup or deck management.
- Start practicing immediately with minimal configuration.

## 3. Functional Requirements

FR-1 AI flashcard generation
- Input: English-only pasted text in a textarea.
- Limits: maximum input length 10,000 characters per request; requests producing at most 5 proposed cards per generation.
- Output schema: strict JSON array of objects { front: string, back: string }.
- Length caps: front ≤ 200 characters; back ≤ 500 characters.
- Server-side: validate JSON schema and character limits; gracefully handle invalid model output.
- Client-side: show character counters on edit; highlight validation errors.

FR-2 Proposal review and inline editing
- Present proposed cards in a list with inline editing of front/back before acceptance.
- Accept is disabled until both fields pass validation and character limits.
- Reject discards a proposal immediately without any persistence.
- No IDs are assigned and no writes occur until Accept.

FR-3 Manual card creation
- Provide a simple form to create a single card with the same field names and limits.
- Inline validation and counters identical to proposal edits.

FR-4 Persistence model
- Persist only upon explicit Accept (or manual create Save).
- All accepted/saved cards are stored in a single default collection.
- Duplicates are allowed; no deduplication in MVP.
- Persisted card fields: id, front, back, origin (ai|manual), createdAt, updatedAt, userId.

FR-5 Authentication and authorization
- All application usage requires authentication; users must sign in before accessing features.
- Automatic redirection: Unauthenticated users attempting to access any protected route (/, /cards, /practice) are automatically redirected to /auth/sign-in with the intended destination preserved as a returnUrl parameter.
- Authentication via email/password with email verification (Supabase).
- New accounts are created with email and password; a verification email is sent and must be confirmed before sign-in.
- After successful login, users are automatically returned to their intended destination (from returnUrl) and can continue any pending action.
- Authenticated users attempting to access auth pages (except verification pages) are automatically redirected to the home page or their intended destination.
- Users can sign out; their saved cards are private to their account.
- Public routes (no authentication required): /auth/sign-in, /auth/sign-up, /auth/reset-password, /auth/reset-password/confirm, /auth/verify/*

FR-6 Pending state handling
- Pending proposals exist only client-side until acceptance.
- Use local storage to preserve pending proposals across refresh and re-authentication.

FR-7 Practice mode (no scheduling)
- Start a session that shuffles all saved cards.
- Card interaction: reveal back, mark correct or incorrect, then proceed to next.
- Provide minimal session summary (e.g., correct count / total) when the deck is exhausted.
- No spaced-repetition scheduling or intervals in MVP.

FR-8 Error handling and empty states
- If model quota or rate limit is reached, display a friendly message and suggest manual creation.
- Handle network/model errors with retry options and non-blocking fallbacks.
- Meaningful empty states for no proposals, no saved cards, and end-of-practice.

FR-9 Analytics and measurement
- Events: generate, accept, reject, manual_create, practice_done.
- Each event includes timestamp, userId, origin (ai|manual where applicable), and lightweight context; do not include raw source text.
- Retention: 90 days.

FR-10 Non-functional constraints (MVP-level)
- English-only UI and content for generation and validation.
- Latency: generation request should typically respond within 10 seconds for average inputs; show loading states.
- Accessibility: keyboard support for practice (space to reveal, 1/2 for correct/incorrect) and basic ARIA labels.
- Privacy: do not store or log raw source text server-side; redact from analytics.

## 4. Product Boundaries

In scope (MVP)
- AI-based proposal generation from pasted English text.
- Manual card creation with the same validation rules.
- Edit/Accept/Reject flows and persistence only on Accept/Save.
- Single default collection; duplicates allowed.
- Simple practice mode with shuffle and correct/incorrect marking.
- Authentication required to access the app (email/password with email verification via Supabase).
- Minimal analytics to support KPI measurement.

Out of scope (MVP)
- Advanced spaced-repetition algorithms or scheduling (e.g., SM-2).
- Decks/collections management beyond a single default collection.
- Import formats (PDF, DOCX, etc.) and external integrations.
- Sharing sets with other users.
- Mobile apps; web-only for MVP.
- Accept All action.
- Export of cards and account deletion flows.

Key constraints
- Strict schema and character limits enforced both client-side and server-side.
- No raw source text stored on the server or in analytics.
- Budget model usage via OpenRouter with daily org/user caps to control spend.

Open questions (to finalize)
- Final default model choice and daily caps (user/org) for OpenRouter.
 - Exact UX copy for credentials sign-up/sign-in and email verification flow and errors.
- Detailed practice UX refinements (e.g., per-session stats depth).
- Export JSON and account deletion timing/policy post-MVP.

Dependencies
- OpenRouter access and billing configuration.
- Supabase authentication and database.

## 5. User Stories

### US-001 Generate proposals from pasted text
ID: US-001
Title: Generate proposals from pasted text
Description: As a learner, I paste English text and generate AI proposals.
Acceptance Criteria:
- Given input ≤ 10,000 characters, when I click Generate, then proposals load or an error is shown on failure.
- Proposals conform to schema { front, back } and are displayed in a list.
- If the model returns invalid JSON, I see an error and a Retry option.

### US-002 Block generation when input exceeds limit
ID: US-002
Title: Block generation when input exceeds limit
Description: As a learner, I am prevented from generating if my input is too long.
Acceptance Criteria:
- Given input > 10,000 characters, Generate is disabled with an inline message.
- When I reduce input to ≤ 10,000, Generate becomes enabled.

### US-003 Inline edit of proposed cards
ID: US-003
Title: Inline edit of proposed cards
Description: As a learner, I can edit front/back of each proposed card inline.
Acceptance Criteria:
- Each proposal shows editable fields for front and back with character counters.
- Edits update counters and validation in real time.

### US-004 Validate proposed card limits
ID: US-004
Title: Validate proposed card limits
Description: As a learner, I see validation for length limits on proposals.
Acceptance Criteria:
- If front > 200 or back > 500 characters, inline error appears.
- Accept is disabled until both fields satisfy limits.

### US-005 Accept a valid proposal and persist
ID: US-005
Title: Accept a valid proposal and persist
Description: As a learner, I can accept a valid proposal to save it.
Acceptance Criteria:
- On Accept, the card is saved with origin=ai and persists in my default collection.
- I see a confirmation and the proposal is removed from the pending list.

### US-006 Reject a proposal
ID: US-006
Title: Reject a proposal
Description: As a learner, I can discard a proposal without saving it.
Acceptance Criteria:
- Clicking Reject removes the proposal from the list without any server write.

### US-007 Require login to use the app
ID: US-007
Title: Require login to use the app
Description: As a learner, I must sign in with email and password before using the app.
Acceptance Criteria:
- Unauthenticated users attempting to access protected routes (/, /cards, /practice) are automatically redirected to the sign-in page.
- The intended destination URL is preserved in the returnUrl query parameter (e.g., /auth/sign-in?returnUrl=%2F).
- After successful login, users are automatically returned to their intended destination.
- Authenticated users attempting to access auth pages are automatically redirected to the home page.

### US-031 Sign up and verify email
ID: US-031
Title: Sign up and verify email
Description: As a learner, I create an account with email and password and verify my email before signing in.
Acceptance Criteria:
- After sign-up, I receive a verification email with a confirmation link.
- Clicking the link verifies my email and enables sign-in with my credentials.
- Attempting to sign in before verification shows a helpful message and a Resend verification option.

### US-008 Preserve pending proposals across login/refresh
ID: US-008
Title: Preserve pending proposals across login/refresh
Description: As a learner, I do not lose my pending proposals when I refresh or log in.
Acceptance Criteria:
- Pending proposals remain available after page reload.
- After re-authenticating, my pending list is unchanged until I act on it.

### US-009 Manual create a card
ID: US-009
Title: Manual create a card
Description: As a learner, I can create a card manually with the same limits.
Acceptance Criteria:
- The form validates front ≤ 200 and back ≤ 500 characters with counters.
- Save persists the card with origin=manual.

### US-010 Browse saved cards
ID: US-010
Title: Browse saved cards
Description: As a learner, I can view my saved cards in a list.
Acceptance Criteria:
- I can see all saved cards in my default collection.
- Empty state is displayed if I have no cards.

### US-011 Edit a saved card
ID: US-011
Title: Edit a saved card
Description: As a learner, I can edit front/back of a saved card.
Acceptance Criteria:
- Editing uses the same validation and counters.
- On Save, the card updates and shows a confirmation.

### US-012 Delete a saved card
ID: US-012
Title: Delete a saved card
Description: As a learner, I can delete a saved card.
Acceptance Criteria:
- Deleting removes the card from my collection after confirmation.
- The list updates and, if none remain, shows the empty state.

### US-013 Start a practice session
ID: US-013
Title: Start a practice session
Description: As a learner, I can start practicing my saved cards.
Acceptance Criteria:
- Start Practice shuffles my current saved cards.
- If I have zero cards, I see an empty state with a link to create cards.

### US-014 Reveal back of card
ID: US-014
Title: Reveal back of card
Description: As a learner, I can reveal the back during practice.
Acceptance Criteria:
- Clicking Reveal or pressing space toggles the back view.

### US-015 Mark correct/incorrect
ID: US-015
Title: Mark correct/incorrect
Description: As a learner, I can mark my response and proceed.
Acceptance Criteria:
- I can mark a card correct or incorrect via buttons or keyboard (1/2).
- Next card appears immediately after marking.

### US-016 See session summary
ID: US-016
Title: See session summary
Description: As a learner, I can see basic stats at the end of practice.
Acceptance Criteria:
- At session end, I see total cards practiced and number correct.

### US-017 Generation requires authentication
ID: US-017
Title: Generation requires authentication
Description: As a learner, I must be authenticated to generate proposals.
Acceptance Criteria:
- Generate is unavailable until authenticated and prompts sign-in when needed.
- After login, Generate works normally.

### US-018 Sign out
ID: US-018
Title: Sign out
Description: As a learner, I can sign out from my account.
Acceptance Criteria:
- After sign out, my saved cards are not accessible until I sign in again.
- Pending proposals in local storage remain available.

### US-019 Handle AI quota/rate limit errors
ID: US-019
Title: Handle AI quota/rate limit errors
Description: As a learner, I am informed if generation is unavailable due to limits.
Acceptance Criteria:
- On quota/rate-limit error, I see a friendly message with a suggestion to use manual create.
- Generate is disabled briefly to prevent rapid retries.

### US-020 Handle network/model errors
ID: US-020
Title: Handle network/model errors
Description: As a learner, I can retry when generation fails unexpectedly.
Acceptance Criteria:
- Errors show a non-blocking banner/toast and a Retry action.

### US-021 Duplicate cards allowed
ID: US-021
Title: Duplicate cards allowed
Description: As a learner, I can save duplicates without warnings in MVP.
Acceptance Criteria:
- Saving a card with identical front/back to an existing one succeeds.

### US-022 No Accept All in MVP
ID: US-022
Title: No Accept All in MVP
Description: As a learner, I must accept or reject cards individually.
Acceptance Criteria:
- There is no control to accept multiple proposals in one action.

### US-023 Validation of server-side schema
ID: US-023
Title: Validation of server-side schema
Description: As a system, only valid cards are persisted.
Acceptance Criteria:
- Attempts to persist cards exceeding limits or violating schema are rejected with 4xx and a user-friendly error.

### US-024 Do not store raw source text
ID: US-024
Title: Do not store raw source text
Description: As a privacy-conscious user, my pasted text is not stored.
Acceptance Criteria:
- Server logs and analytics events contain no raw source text.

### US-025 Analytics events
ID: US-025
Title: Analytics events
Description: As a product team, I can measure acceptance rate and AI share.
Acceptance Criteria:
- generate, accept, reject, manual_create, practice_done events are sent with required fields.
- Event payloads exclude raw source text and PII other than userId.

### US-026 Character counters visible
ID: US-026
Title: Character counters visible
Description: As a learner, I can see remaining characters for front/back.
Acceptance Criteria:
- Real-time counters are visible in proposal edits and manual create forms.

### US-027 Empty states
ID: US-027
Title: Empty states
Description: As a learner, I see helpful guidance when there is nothing to show.
Acceptance Criteria:
- Dedicated empty states for no proposals, no saved cards, and after finishing practice.

### US-028 Resume action after login
ID: US-028
Title: Resume action after login
Description: As a learner, my in-progress action continues seamlessly after logging in.
Acceptance Criteria:
- If my session expires or I access a protected route while unauthenticated, I am automatically redirected to the sign-in page with my intended destination preserved.
- After successful authentication, I am automatically returned to my original destination without manual navigation.
- My pending proposals and any in-progress edits are preserved across the authentication flow (via localStorage).

### US-029 Invalid JSON from AI
ID: US-029
Title: Invalid JSON from AI
Description: As a learner, I am notified if AI returns invalid JSON and can retry.
Acceptance Criteria:
- If parsing fails, an error message is shown and Retry is available without losing pending proposals.

### US-030 Input sanitation
ID: US-030
Title: Input sanitation
Description: As a system, user-entered content is sanitized for storage and display.
Acceptance Criteria:
- Stored cards are sanitized to prevent XSS; display escapes unsafe characters.

## 6. Success Metrics

Primary KPIs
- Acceptance rate: at least 75% of AI-generated proposals are accepted (counting explicit Accept actions).
- AI creation share: at least 75% of all created (accepted) cards originated from AI (origin=ai), allowing edits pre-accept.

Instrumentation
- Event set: generate, accept, reject, manual_create, practice_done, each with timestamp, userId, origin (ai|manual when applicable), and minimal context. No raw source text stored.
- Retention: 90 days for analytics events.

Counting rules
- Accepted = explicit Accept action resulting in successful persistence.
- AI-created share = accepted cards with origin=ai, regardless of pre-accept edits.

Operational guardrails (MVP)
- Generation caps: input ≤ 10,000 characters per request; up to 20 proposals returned per request.
- Budget control: per-user and per-org daily caps for OpenRouter usage (to be finalized during implementation).
- Latency: typical generation response within 10 seconds for average inputs; show progress/loader.

