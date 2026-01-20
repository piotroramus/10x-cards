# UI Architecture for Lang Memo

## 1. UI Structure Overview

Lang Memo is a desktop-first, responsive single-page application (SPA) built with Astro 5 and React 19. The UI follows a three-view navigation structure optimized for speed to value and minimal UX complexity. The architecture emphasizes strict quality constraints, authentication-first access, and seamless state management across page refreshes.

**Core Principles:**
- **Desktop-first responsive design** with mobile optimizations
- **Authentication-required access** to all application features
- **Client-side state management** with localStorage persistence for pending proposals
- **Server-side pagination** on desktop, infinite scroll on mobile
- **Full-screen practice mode** with keyboard shortcuts
- **Real-time validation** with visual feedback
- **Optimistic UI updates** with rollback capability
- **Comprehensive error handling** with user-friendly messages

**Technology Stack:**
- Astro 5 for static page structure
- React 19 for dynamic components and state management
- Supabase Auth for client-side authentication
- React Query for server state caching and synchronization
- Shadcn/ui for consistent component library
- Tailwind 4 for responsive styling

## 2. View List

### 2.1 Generate/Review View

**View Path:** `/` (default authenticated landing page)

**Main Purpose:**
Primary interface for AI flashcard generation from pasted text, proposal review and editing, and manual card creation. This is the default landing page after authentication and serves as the main entry point for card creation workflows.

**Key Information to Display:**
- Text input area with character counter (max 10,000 characters)
- Generate button (disabled when input exceeds limit or user unauthenticated)
- Loading state during AI generation (progress indicator, cancellation option)
- List of pending proposals with inline editing capabilities
- Manual card creation form (collapsible or separate section)
- Empty state when no proposals exist
- Error states for generation failures, quota limits, and network errors

**Key View Components:**
- `TextInputArea`: Large textarea with character counter (10,000 max), placeholder text, and validation feedback
- `GenerateButton`: Primary action button with loading state, disabled states, and error handling
- `ProposalList`: Scrollable container displaying pending proposals
- `CardProposalEditor`: Individual proposal component with:
  - Editable front/back text fields
  - Real-time character counters (front: 200 max, back: 500 max)
  - Color-coded feedback (green/yellow/red thresholds)
  - Inline validation error messages
  - Accept button (disabled until validation passes)
  - Reject button (immediate removal, async analytics tracking)
- `ManualCardForm`: Form component with same validation as proposals (front/back fields, character counters, Save button)
- `EmptyState`: Contextual messaging when no proposals exist ("No proposals yet. Paste text and generate to get started.")
- `ErrorBanner`: Prominent display for quota errors, network failures, and invalid JSON responses with retry options
- `LoadingSkeleton`: Shimmer effect for proposal list during generation

**UX Considerations:**
- Character counter updates in real-time with visual feedback
- Generate button disabled with inline message when input exceeds 10,000 characters
- Proposals appear immediately after generation completes
- Accept/Reject actions provide immediate visual feedback
- Toast notifications for successful operations (3-second auto-dismiss)
- Optimistic UI updates for Accept actions with rollback on failure
- Manual form can be collapsed/expanded to reduce visual clutter
- Responsive layout: single column on mobile, two-column (input + proposals) on desktop

**Accessibility Considerations:**
- ARIA labels for all form inputs and buttons
- Keyboard navigation support (Tab, Enter, Escape)
- Screen reader announcements for character limits and validation errors
- Focus management when proposals are added/removed
- Color contrast compliance for character counter feedback (WCAG AA)
- Descriptive error messages for assistive technologies

**Security Considerations:**
- Input sanitization before display and storage
- HTML/JavaScript escaping for all user-entered content
- Authentication check before Generate button activation
- No raw source text stored in localStorage or sent to analytics
- XSS prevention through proper escaping

### 2.2 My Cards View

**View Path:** `/cards`

**Main Purpose:**
Browse, edit, and delete saved cards in a paginated list. Provides full CRUD operations for user's card collection with responsive editing patterns (inline on desktop, modal on mobile).

**Key Information to Display:**
- Paginated list of saved cards (default 50 per page, max 100)
- Card display: front text, back text (expandable/collapsible), origin badge (AI/Manual), creation date
- Edit button for each card (triggers inline editing on desktop, bottom sheet modal on mobile)
- Delete button with confirmation dialog
- Pagination controls (desktop) or infinite scroll with "Load more" button (mobile)
- Empty state when no cards exist
- Loading skeletons during data fetch
- Success/error toast notifications for update/delete operations

**Key View Components:**
- `CardList`: Container component managing pagination or infinite scroll
- `CardItem`: Individual card display component with:
  - Front/back text display (back initially hidden, expandable)
  - Origin badge (AI/Manual) with visual distinction
  - Created/updated timestamps
  - Edit button (triggers editing mode)
  - Delete button (triggers confirmation dialog)
- `CardEditor`: Editing component (inline on desktop ≥768px, bottom sheet modal on mobile <768px) with:
  - Editable front/back text fields
  - Real-time character counters with validation
  - Save/Cancel buttons
  - Same validation logic as proposal editing
- `PaginationControls`: Desktop pagination component (Shadcn/ui) with page numbers, prev/next buttons, and page size selector
- `InfiniteScrollLoader`: Mobile component with "Load more" button and loading indicator
- `DeleteConfirmationDialog`: Modal dialog confirming card deletion with "Delete" and "Cancel" actions
- `EmptyState`: Contextual messaging ("No saved cards yet. Generate proposals or create cards manually to get started.") with links to Generate view and manual creation
- `LoadingSkeleton`: Shimmer effect for card list during initial load and pagination

**UX Considerations:**
- Cards displayed in chronological order (newest first)
- Smooth transitions between list and edit modes
- Optimistic UI updates for edit/delete with rollback on failure
- Inline editing preserves scroll position on desktop
- Bottom sheet modal on mobile provides full-screen editing experience
- Delete confirmation prevents accidental data loss
- Pagination provides clear navigation (current page, total pages, item counts)
- Infinite scroll on mobile reduces friction for browsing large collections
- Viewport-based detection automatically switches between pagination and infinite scroll

**Accessibility Considerations:**
- ARIA labels for all card actions (edit, delete, pagination)
- Keyboard navigation for card list (arrow keys, Enter to edit)
- Screen reader announcements for pagination changes
- Focus management in edit mode and delete confirmation
- Keyboard shortcuts for common actions (Escape to cancel edit)
- Focus trap in bottom sheet modal on mobile

**Security Considerations:**
- Authentication required to access view
- User can only view/edit/delete their own cards (enforced by API and RLS)
- Input sanitization for edited card content
- Confirmation required for destructive actions (delete)

### 2.3 Practice View

**View Path:** `/practice`

**Main Purpose:**
Full-screen, distraction-free practice session for reviewing saved cards. Displays one card at a time with reveal, correct/incorrect marking, and session statistics. Sessions are ephemeral (not persisted across refreshes).

**Key Information to Display:**
- Current card front (initially visible)
- Reveal button to show card back
- Card back (hidden until reveal)
- Correct and Incorrect buttons (visible after reveal)
- Session progress indicator (current card number / total cards)
- Keyboard shortcut hints (optional, dismissible)
- Session summary modal upon completion with statistics
- Navigation warning if user attempts to leave during active session
- Empty state if no cards available for practice

**Key View Components:**
- `PracticeSession`: Main container managing session state and card progression
- `PracticeCard`: Full-screen card display component with:
  - Front text (large, readable font)
  - Reveal button (prominent, touch-optimized on mobile)
  - Back text (hidden until reveal, smooth transition)
  - Correct button (green, keyboard shortcut: 1 or C)
  - Incorrect button (red, keyboard shortcut: 2 or I)
  - Progress indicator (e.g., "Card 5 of 20")
- `SessionSummaryModal`: Completion modal displaying:
  - Heading: "Practice session complete"
  - Statistics: "You practiced X cards", "You got Y correct", "Y/X (Z%)"
  - Actions: "Start New Session" button, "Back to Cards" link
  - Visual representation of performance (optional progress bar)
- `KeyboardShortcutsHint`: Dismissible overlay showing keyboard shortcuts (Space: reveal, 1/C: correct, 2/I: incorrect, Esc: exit)
- `EmptyState`: Contextual messaging ("No cards available for practice. Create or accept cards to get started.") with links to Generate and My Cards views
- `NavigationWarning`: Browser navigation guard warning user about leaving active session (prevents accidental data loss)

**UX Considerations:**
- Full-screen interface eliminates distractions
- Smooth transitions between card states (front → reveal → back → next)
- Large touch targets (minimum 44x44px) for mobile interactions
- Portrait-optimized layout on mobile devices
- Immediate visual feedback for correct/incorrect actions
- Progress indicator provides sense of completion
- Session summary appears automatically upon completion
- Keyboard shortcuts enable rapid practice flow
- Client-side Fisher-Yates shuffling ensures random card order
- Fresh card fetch on session start (no stale data)

**Accessibility Considerations:**
- Keyboard shortcuts fully supported (Space, 1/C, 2/I, Esc)
- ARIA labels for all interactive elements
- Screen reader announcements for card transitions and session progress
- Focus management when revealing back and moving to next card
- High contrast mode support for card text
- Keyboard navigation hints visible and dismissible
- Focus trap in session summary modal

**Security Considerations:**
- Authentication required to access view
- Cards fetched fresh on session start (no cached sensitive data)
- Session state not persisted (ephemeral, cleared on navigation)
- Navigation warning prevents accidental session loss

### 2.4 Sign In Page

**View Path:** `/auth/sign-in`

**Main Purpose:**
Authenticate existing users with email and password. Supports return URL parameter for seamless post-login navigation back to intended destination.

**Key Information to Display:**
- Email input field
- Password input field
- Sign in button
- "Forgot password?" link (optional, out of scope for MVP)
- "Don't have an account? Sign up" link
- Error messages for authentication failures
- Email verification error message with resend option (if user attempts sign-in before verification)
- Loading state during authentication

**Key View Components:**
- `SignInForm`: Form component with email/password fields and validation
- `EmailInput`: Text input with email validation and ARIA labels
- `PasswordInput`: Password input with show/hide toggle and ARIA labels
- `SignInButton`: Primary action button with loading state
- `ErrorMessage`: Display component for authentication errors
- `VerificationErrorBanner`: Prominent banner for unverified email with:
  - Message: "Please verify your email address before signing in. Check your inbox for the verification link."
  - "Resend verification email" button
  - Helper text: "Didn't receive it? Check your spam folder or try resending."
- `LoadingSpinner`: Visual indicator during authentication request

**UX Considerations:**
- Clear, focused form layout
- Inline validation for email format
- Password strength indicator (optional, out of scope for MVP)
- Remember me checkbox (optional, out of scope for MVP)
- Auto-focus on email input on page load
- Return URL parameter preserved and used after successful authentication
- Smooth transition to intended destination after sign-in
- Error messages displayed prominently with actionable guidance

**Accessibility Considerations:**
- ARIA labels for all form inputs
- Keyboard navigation (Tab, Enter to submit)
- Screen reader announcements for errors and success
- Focus management on error display
- High contrast support for form elements
- Descriptive error messages for assistive technologies

**Security Considerations:**
- Password input masked by default
- HTTPS required for authentication (enforced by Supabase)
- Rate limiting on authentication attempts (handled by Supabase)
- No password storage or transmission in plain text
- Secure token storage (in-memory only, not localStorage)
- CSRF protection (handled by Supabase)

### 2.5 Sign Up Page

**View Path:** `/auth/sign-up`

**Main Purpose:**
Create new user accounts with email and password. Triggers email verification workflow and redirects to email verification confirmation page.

**Key Information to Display:**
- Email input field
- Password input field
- Password confirmation field (optional, recommended for UX)
- Sign up button
- "Already have an account? Sign in" link
- Password strength requirements (optional)
- Error messages for validation failures and account creation errors
- Loading state during account creation

**Key View Components:**
- `SignUpForm`: Form component with email, password, and optional password confirmation fields
- `EmailInput`: Text input with email validation
- `PasswordInput`: Password input with strength indicator (optional) and show/hide toggle
- `PasswordConfirmationInput`: Optional password confirmation field with matching validation
- `SignUpButton`: Primary action button with loading state
- `ErrorMessage`: Display component for validation and creation errors
- `PasswordRequirements`: Optional component displaying password strength rules
- `LoadingSpinner`: Visual indicator during account creation request

**UX Considerations:**
- Clear form layout with helpful placeholder text
- Real-time password strength feedback (optional)
- Password confirmation matching validation
- Auto-focus on email input
- Smooth redirect to email verification confirmation page after successful sign-up
- Error messages with specific guidance for resolution

**Accessibility Considerations:**
- ARIA labels for all form inputs
- Keyboard navigation support
- Screen reader announcements for validation errors
- Focus management on error display
- Descriptive error messages

**Security Considerations:**
- Password input masked by default
- Password strength validation (minimum length, complexity)
- Email format validation
- HTTPS required
- Secure token handling
- Email verification required before account activation

### 2.6 Email Verification Check Page

**View Path:** `/auth/verify/check`

**Main Purpose:**
Confirmation screen displayed after sign-up, instructing users to check their email for verification link. Provides resend functionality and navigation back to sign-in.

**Key Information to Display:**
- Heading: "Check your email"
- Body text: "We've sent a verification link to {email}. Please click the link in the email to verify your account before signing in."
- "Resend verification email" button
- "Back to sign in" link
- Success message after resend (toast notification)
- Error message if resend fails

**Key View Components:**
- `VerificationCheckContent`: Main content area with heading, body text, and email display
- `ResendButton`: Action button to resend verification email with loading state
- `BackToSignInLink`: Navigation link to sign-in page
- `SuccessToast`: Toast notification confirming email resend
- `ErrorMessage`: Display component for resend failures

**UX Considerations:**
- Clear, centered layout
- Email address displayed prominently for user confirmation
- Resend button provides immediate feedback
- Helpful guidance about checking spam folder (in body text or helper text)
- Smooth navigation back to sign-in

**Accessibility Considerations:**
- ARIA labels for all interactive elements
- Screen reader announcements for resend success/failure
- Keyboard navigation support
- High contrast support

**Security Considerations:**
- Rate limiting on resend requests (handled by Supabase)
- Email address display is safe (user-provided, not sensitive)

### 2.7 Email Verification Success Page

**View Path:** `/auth/verify/success`

**Main Purpose:**
Confirmation screen displayed after user successfully verifies email via verification link. Provides clear success messaging and navigation to sign-in.

**Key Information to Display:**
- Heading: "Email verified!"
- Body text: "Your email has been verified. You can now sign in to your account."
- "Sign in" button (primary action)
- Success icon or visual indicator (optional)

**Key View Components:**
- `VerificationSuccessContent`: Main content area with heading and body text
- `SignInButton`: Primary action button navigating to sign-in page
- `SuccessIcon`: Optional visual indicator (checkmark, etc.)

**UX Considerations:**
- Clear, celebratory messaging
- Prominent sign-in button
- Smooth transition to sign-in page

**Accessibility Considerations:**
- ARIA labels for all interactive elements
- Screen reader announcement of success
- Keyboard navigation support

**Security Considerations:**
- Verification link validation (handled by Supabase)
- One-time use verification tokens

### 2.8 Email Verification Error Page

**View Path:** `/auth/verify/error`

**Main Purpose:**
Error screen displayed when verification link is invalid or expired. Provides clear error messaging and option to request new verification email.

**Key Information to Display:**
- Error message: "This verification link is invalid or has expired. Please request a new verification email."
- "Resend verification email" button
- "Back to sign in" link
- Error icon or visual indicator (optional)

**Key View Components:**
- `VerificationErrorContent`: Main content area with error message
- `ResendButton`: Action button to request new verification email
- `BackToSignInLink`: Navigation link to sign-in page
- `ErrorIcon`: Optional visual indicator

**UX Considerations:**
- Clear error messaging with actionable guidance
- Prominent resend button
- Helpful navigation options

**Accessibility Considerations:**
- ARIA labels for all interactive elements
- Screen reader announcement of error
- Keyboard navigation support

**Security Considerations:**
- Invalid/expired link handling (no security risk)
- Rate limiting on resend requests

## 3. User Journey Map

### 3.1 New User Onboarding Journey

1. **Landing (Unauthenticated)**
   - User arrives at application root (`/`)
   - Authentication guard middleware detects unauthenticated state
   - User redirected to `/auth/sign-in` with return URL parameter (`?returnUrl=/`)

2. **Sign Up**
   - User clicks "Don't have an account? Sign up" link on sign-in page
   - Navigates to `/auth/sign-up`
   - User enters email and password
   - User submits sign-up form
   - Account creation request sent to Supabase
   - On success: User redirected to `/auth/verify/check` with email display

3. **Email Verification Check**
   - User views verification check page
   - User receives email with verification link
   - User clicks verification link in email
   - On success: User redirected to `/auth/verify/success`
   - On error: User redirected to `/auth/verify/error`

4. **Email Verification Success**
   - User views success page
   - User clicks "Sign in" button
   - Navigates to `/auth/sign-in`

5. **Sign In**
   - User enters email and password
   - User submits sign-in form
   - Authentication request sent to Supabase
   - On success: User redirected to return URL (default: `/`) with authenticated session
   - On verification error: Error banner displayed with resend option

6. **Generate/Review (Default Landing)**
   - User lands on `/` (Generate/Review view)
   - User can paste text and generate proposals
   - User can create cards manually
   - User can navigate to My Cards or Practice views

### 3.2 Returning User Journey

1. **Sign In**
   - User navigates to `/auth/sign-in` (or redirected by auth guard)
   - User enters credentials
   - On success: User redirected to intended destination (or default `/`)

2. **Generate/Review**
   - User lands on `/` with authenticated session
   - Pending proposals from localStorage are restored (if any)
   - User can generate new proposals or continue working with pending proposals

### 3.3 Card Creation Journey (AI Generation)

1. **Generate Proposals**
   - User pastes text into input area (max 10,000 characters)
   - Character counter updates in real-time
   - User clicks "Generate" button
   - Loading state displayed with progress indicator
   - AI generation request sent to `/api/cards/generate`
   - On success: Proposals displayed in list with temporary client-side IDs
   - On error: Error banner displayed with retry option

2. **Review and Edit Proposals**
   - User reviews each proposal in list
   - User can edit front/back text inline
   - Character counters update with color-coded feedback
   - Validation errors displayed if limits exceeded
   - Accept button disabled until validation passes

3. **Accept Proposal**
   - User clicks "Accept" on valid proposal
   - Optimistic UI update: Proposal removed from list immediately
   - Accept request sent to `/api/cards/accept`
   - Analytics event `accept` created automatically
   - On success: Toast notification displayed, card saved
   - On failure: Rollback optimistic update, error displayed, proposal restored to list

4. **Reject Proposal**
   - User clicks "Reject" on proposal
   - Proposal removed from list immediately (no API call)
   - Analytics event `reject` queued for async batch sending
   - No persistence occurs

### 3.4 Card Creation Journey (Manual)

1. **Open Manual Form**
   - User expands manual card creation form (or navigates to dedicated section)
   - Form displays front/back input fields with character counters

2. **Create Card**
   - User enters front text (max 200 characters)
   - User enters back text (max 500 characters)
   - Character counters update with validation feedback
   - User clicks "Save" button
   - Validation check passes
   - Create request sent to `/api/cards`
   - Analytics event `manual_create` created automatically
   - On success: Toast notification displayed, form reset, card saved
   - On failure: Error displayed, form data preserved

### 3.5 Card Management Journey

1. **Browse Cards**
   - User navigates to `/cards` (My Cards view)
   - Card list fetched from `/api/cards` with pagination (default page 1, limit 50)
   - Cards displayed in chronological order (newest first)
   - On desktop: Pagination controls visible
   - On mobile: Infinite scroll with "Load more" button

2. **Edit Card (Desktop)**
   - User clicks "Edit" on card
   - Card transitions to inline edit mode
   - Front/back fields become editable with character counters
   - User modifies content
   - User clicks "Save"
   - Update request sent to `/api/cards/:id`
   - On success: Card updated, edit mode exits, toast notification
   - On failure: Error displayed, edit mode remains

3. **Edit Card (Mobile)**
   - User clicks "Edit" on card
   - Bottom sheet modal opens with card editor
   - User modifies content
   - User clicks "Save"
   - Update request sent to `/api/cards/:id`
   - On success: Modal closes, card updated, toast notification
   - On failure: Error displayed, modal remains open

4. **Delete Card**
   - User clicks "Delete" on card
   - Confirmation dialog appears
   - User confirms deletion
   - Optimistic UI update: Card removed from list immediately
   - Delete request sent to `/api/cards/:id`
   - On success: Toast notification, card permanently removed
   - On failure: Rollback optimistic update, error displayed, card restored

### 3.6 Practice Session Journey

1. **Start Practice**
   - User navigates to `/practice`
   - Practice cards fetched from `/api/cards/practice`
   - On empty: Empty state displayed with links to create cards
   - On success: Cards shuffled client-side (Fisher-Yates algorithm)
   - Session state initialized (current index, correct count, total count)

2. **Practice Card**
   - Current card front displayed
   - User clicks "Reveal" or presses Space
   - Card back revealed with smooth transition
   - User clicks "Correct" (or presses 1/C) or "Incorrect" (or presses 2/I)
   - Response recorded in session state
   - Next card displayed automatically
   - Progress indicator updated

3. **Complete Session**
   - Last card marked (correct/incorrect)
   - Session summary modal appears automatically
   - Statistics displayed: total cards, correct count, percentage
   - User clicks "Start New Session" or "Back to Cards"
   - On "Start New Session": Fresh cards fetched, new session begins
   - On "Back to Cards": Navigates to `/cards`, session state cleared
   - Analytics event `practice_done` sent to `/api/analytics/practice-done`

4. **Navigation During Session**
   - User attempts to navigate away during active session
   - Navigation warning displayed (browser confirmation dialog or custom modal)
   - User confirms: Session state cleared, navigation proceeds
   - User cancels: Navigation prevented, session continues

## 4. Layout and Navigation Structure

### 4.1 Main Layout Structure

**Desktop Layout (≥768px):**
```
┌─────────────────────────────────────────────────┐
│  Top Navigation Bar (fixed)                     │
│  [Logo] [Generate] [My Cards] [Practice] [User]│
├─────────────────────────────────────────────────┤
│                                                 │
│  Main Content Area (scrollable)                 │
│  [View-specific content]                        │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Mobile Layout (<768px):**
```
┌─────────────────────┐
│  Hamburger Menu     │
│  [☰] [Logo]        │
├─────────────────────┤
│                     │
│  Main Content       │
│  (full width)       │
│                     │
└─────────────────────┘
```

### 4.2 Navigation Components

**Top Navigation Bar (Desktop):**
- **Logo/Brand**: Left-aligned, links to `/` (Generate/Review view)
- **Navigation Links**: Horizontal list
  - "Generate" → `/` (Generate/Review view)
  - "My Cards" → `/cards`
  - "Practice" → `/practice`
- **User Menu**: Right-aligned dropdown
  - User email/name display
  - "Sign Out" action
- **Active State**: Current view link highlighted

**Hamburger Menu (Mobile):**
- **Trigger**: Hamburger icon (☰) in top-left
- **Menu**: Slide-out drawer or dropdown
  - "Generate" → `/`
  - "My Cards" → `/cards`
  - "Practice" → `/practice`
  - Divider
  - User email/name
  - "Sign Out" action
- **Overlay**: Dark backdrop when menu open
- **Close**: Tap outside or close button

### 4.3 Authentication Guard

**Middleware Behavior:**
- All routes except `/auth/*` require authentication
- Unauthenticated users redirected to `/auth/sign-in` with return URL parameter
- Return URL preserved and used after successful authentication
- Token refresh handled automatically (Supabase client-side)
- Session expiration triggers re-authentication flow

**Protected Routes:**
- `/` (Generate/Review)
- `/cards` (My Cards)
- `/practice` (Practice)

**Public Routes:**
- `/auth/sign-in`
- `/auth/sign-up`
- `/auth/verify/check`
- `/auth/verify/success`
- `/auth/verify/error`

### 4.4 Responsive Breakpoints

**Tailwind 4 Default Breakpoints:**
- `sm`: 640px (small tablets, large phones)
- `md`: 768px (tablets, small desktops) - **Primary breakpoint for desktop/mobile split**
- `lg`: 1024px (desktops)
- `xl`: 1280px (large desktops)

**Feature Detection:**
- Pagination vs. infinite scroll: Viewport width < 768px → infinite scroll
- Inline editing vs. modal: Viewport width < 768px → bottom sheet modal
- Navigation: Viewport width < 768px → hamburger menu

## 5. Key Components

### 5.1 State Management Components

**AuthProvider (React Context):**
- Manages Supabase authentication state
- Provides `user`, `session`, `loading` state
- Handles token refresh automatically
- Exposes `signIn`, `signOut`, `signUp` methods
- Tokens stored in-memory only (not localStorage)

**PendingProposalsProvider (React Context + Custom Hook):**
- Manages pending proposal state with `usePendingProposals` hook
- Syncs to localStorage for persistence across refreshes
- Generates temporary client-side UUIDs for React keys
- Handles localStorage quota errors gracefully (fallback to in-memory)
- Provides `addProposals`, `removeProposal`, `updateProposal`, `clearAll` methods

**ErrorBoundary (React Error Boundary):**
- Catches React component errors
- Displays user-friendly error UI
- Provides retry functionality
- Logs errors for debugging (without sensitive data)

**AnalyticsProvider (React Context):**
- Manages analytics event queuing
- Batches events for sending (2-3 second intervals)
- localStorage queue for offline persistence
- Fire-and-forget pattern with silent failure handling
- Exposes `trackEvent` method

### 5.2 Form and Input Components

**CharacterCounter:**
- Real-time character count display
- Color-coded feedback:
  - Green: 0-80% of limit
  - Yellow: 80-95% of limit
  - Red: 95-100% of limit
- Accessible label and ARIA live region
- Used in proposal editing, manual creation, and card editing

**TextInputArea:**
- Large textarea for pasted text input
- Character counter integration
- Validation feedback
- Placeholder text and helper text
- Auto-resize or fixed height with scroll

**CardProposalEditor:**
- Editable front/back text fields
- Character counters for both fields
- Inline validation errors
- Accept/Reject action buttons
- Loading state during Accept operation
- Optimistic UI update support

**CardEditor:**
- Shared component for proposal editing and card editing
- Responsive: inline on desktop, modal on mobile
- Front/back text fields with validation
- Save/Cancel actions
- Character counter integration

### 5.3 Display Components

**CardItem:**
- Displays saved card with front/back text
- Expandable/collapsible back text
- Origin badge (AI/Manual)
- Timestamp display
- Edit/Delete action buttons
- Responsive layout (full-width on mobile)

**PracticeCard:**
- Full-screen card display
- Front/back text with reveal transition
- Progress indicator
- Correct/Incorrect action buttons
- Keyboard shortcut support
- Touch-optimized for mobile

**EmptyState:**
- Reusable component with contextual messaging
- Variants: no proposals, no cards, practice complete
- Action links/buttons for next steps
- Illustrative icon or visual (optional)

**LoadingSkeleton:**
- Shimmer effect for async operations
- Card list skeleton
- Proposal list skeleton
- Form skeleton
- Maintains layout during loading

### 5.4 Navigation and Layout Components

**TopNavigation:**
- Desktop: Horizontal navigation bar
- Mobile: Hamburger menu trigger
- Active state highlighting
- User menu dropdown
- Responsive breakpoint handling

**HamburgerMenu:**
- Slide-out drawer or dropdown
- Navigation links
- User information and sign-out
- Overlay backdrop
- Close on outside click or escape

**PaginationControls:**
- Desktop pagination component (Shadcn/ui)
- Page numbers, prev/next buttons
- Page size selector (optional)
- Total count display
- Accessible keyboard navigation

**InfiniteScrollLoader:**
- Mobile "Load more" button
- Loading indicator during fetch
- Automatic trigger on scroll (optional, not recommended for MVP)
- End of list indicator

### 5.5 Modal and Dialog Components

**BottomSheetModal:**
- Mobile card editing modal
- Slides up from bottom
- Full-width on mobile
- Overlay backdrop
- Close on outside tap or swipe down
- Focus trap for accessibility

**DeleteConfirmationDialog:**
- Confirmation modal for destructive actions
- Clear warning message
- Delete and Cancel buttons
- Accessible focus management
- Keyboard shortcut support (Enter to confirm, Escape to cancel)

**SessionSummaryModal:**
- Practice completion summary
- Statistics display
- Action buttons (Start New Session, Back to Cards)
- Centered modal layout
- Accessible focus management

### 5.6 Feedback Components

**Toast (Shadcn/ui):**
- Success/error/info notifications
- 3-second auto-dismiss for success
- Manual dismiss for errors
- Stack multiple toasts
- Accessible announcements

**ErrorBanner:**
- Prominent error display
- Quota errors, network failures
- Retry button integration
- Dismissible (optional)
- Accessible error messaging

**ErrorMessage:**
- Inline form validation errors
- Field-specific error messages
- ARIA error attributes
- Color-coded (red) for visibility

### 5.7 Utility Components

**LoadingSpinner:**
- Circular spinner for async operations
- Used in buttons and full-page loads
- Accessible loading announcements

**ProgressIndicator:**
- Practice session progress
- Current card / total cards
- Visual progress bar (optional)
- Percentage display (optional)

**KeyboardShortcutsHint:**
- Dismissible overlay showing shortcuts
- Practice view specific
- Keyboard shortcut display
- Close button

**NavigationWarning:**
- Browser navigation guard
- Custom confirmation dialog
- Prevents accidental session loss
- Clear warning message

## 6. Error Handling and Edge Cases

### 6.1 Authentication Errors

**Invalid Credentials:**
- Display: "Invalid email or password. Please try again."
- Action: User can retry or navigate to sign-up

**Email Not Verified:**
- Display: Verification error banner with resend option
- Action: "Resend verification email" button

**Token Expired:**
- Display: Automatic redirect to sign-in
- Action: User re-authenticates, returns to intended destination

**Network Error During Auth:**
- Display: "Connection error. Please check your internet and try again."
- Action: Retry button with exponential backoff

### 6.2 AI Generation Errors

**Input Exceeds 10,000 Characters:**
- Display: Generate button disabled with inline message: "Input must be 10,000 characters or less."
- Action: User reduces input length

**Quota Exceeded (402 Payment Required):**
- Display: Prominent error banner: "Generation unavailable due to quota limits. Please try again later or create cards manually."
- Action: Link to manual creation form, retry disabled temporarily

**Invalid JSON from AI (422 Unprocessable Entity):**
- Display: Error banner: "AI returned invalid response. Please try again."
- Action: Retry button (up to 2 retries), manual creation fallback

**Network Error:**
- Display: Error banner with retry option
- Action: Retry button with exponential backoff

**Rate Limit (429 Too Many Requests):**
- Display: "Too many requests. Please wait a moment and try again."
- Action: Retry after delay (display countdown if available)

### 6.3 Card Operation Errors

**Validation Error (400 Bad Request):**
- Display: Inline validation errors with specific field messages
- Action: User corrects input, character counters update

**Card Not Found (404):**
- Display: "Card not found. It may have been deleted."
- Action: Refresh card list, remove from UI

**Network Error:**
- Display: Toast notification with retry option
- Action: Retry button, optimistic update rollback

### 6.4 State Management Edge Cases

**LocalStorage Quota Exceeded:**
- Display: Toast notification: "Unable to save proposals locally. Proposals will be lost on page refresh."
- Action: Continue with in-memory state only, provide "Clear all proposals" option

**Pending Proposals Corrupted:**
- Display: Silent recovery attempt, fallback to empty state
- Action: User can regenerate proposals

**Session Expired During Operation:**
- Display: Redirect to sign-in with return URL
- Action: User re-authenticates, operation resumes if possible

### 6.5 Practice Session Edge Cases

**No Cards Available:**
- Display: Empty state with links to create cards
- Action: Navigate to Generate or My Cards views

**Navigation During Active Session:**
- Display: Navigation warning: "You have an active practice session. Are you sure you want to leave?"
- Action: Confirm to leave (session cleared), Cancel to continue

**Network Error During Practice:**
- Display: Error message with retry option
- Action: Retry fetch, or exit practice mode

### 6.6 Empty States

**No Proposals:**
- Display: "No proposals yet. Paste text and generate to get started."
- Action: Link to text input area, manual creation option

**No Saved Cards:**
- Display: "No saved cards yet. Generate proposals or create cards manually to get started."
- Action: Links to Generate view and manual creation

**Practice Complete:**
- Display: Session summary modal with statistics
- Action: "Start New Session" or "Back to Cards"

## 7. User Story Mapping

### 7.1 Card Generation Stories (US-001 to US-006, US-017, US-019, US-020, US-029)

**US-001: Generate proposals from pasted text**
- **View**: Generate/Review
- **Components**: TextInputArea, GenerateButton, ProposalList, CardProposalEditor
- **Flow**: Paste text → Click Generate → Proposals displayed

**US-002: Block generation when input exceeds limit**
- **View**: Generate/Review
- **Components**: TextInputArea (character counter), GenerateButton (disabled state)
- **Flow**: Input > 10,000 chars → Generate disabled with message

**US-003: Inline edit of proposed cards**
- **View**: Generate/Review
- **Components**: CardProposalEditor (editable fields)
- **Flow**: Click proposal → Edit front/back → Changes saved in state

**US-004: Validate proposed card limits**
- **View**: Generate/Review
- **Components**: CharacterCounter, CardProposalEditor (validation)
- **Flow**: Edit proposal → Character counter updates → Accept disabled if invalid

**US-005: Accept a valid proposal and persist**
- **View**: Generate/Review
- **Components**: CardProposalEditor (Accept button), Toast
- **Flow**: Click Accept → Optimistic update → API call → Success toast

**US-006: Reject a proposal**
- **View**: Generate/Review
- **Components**: CardProposalEditor (Reject button)
- **Flow**: Click Reject → Immediate removal → Async analytics

**US-017: Generation requires authentication**
- **View**: Generate/Review
- **Components**: GenerateButton (disabled when unauthenticated)
- **Flow**: Unauthenticated → Redirect to sign-in → Return after auth

**US-019: Handle AI quota/rate limit errors**
- **View**: Generate/Review
- **Components**: ErrorBanner (quota error)
- **Flow**: Quota error → Banner displayed → Manual creation suggested

**US-020: Handle network/model errors**
- **View**: Generate/Review
- **Components**: ErrorBanner (retry button)
- **Flow**: Error → Banner → Retry with backoff

**US-029: Invalid JSON from AI**
- **View**: Generate/Review
- **Components**: ErrorBanner (invalid JSON message)
- **Flow**: Invalid JSON → Error → Retry option

### 7.2 Authentication Stories (US-007, US-031, US-018, US-028)

**US-007: Require login to use the app**
- **View**: All protected views
- **Components**: Authentication guard middleware
- **Flow**: Unauthenticated → Redirect to sign-in → Return after auth

**US-031: Sign up and verify email**
- **Views**: Sign Up, Email Verification Check, Email Verification Success/Error
- **Components**: SignUpForm, VerificationCheckContent, VerificationSuccessContent
- **Flow**: Sign up → Email sent → Verify → Success page → Sign in

**US-018: Sign out**
- **View**: All authenticated views
- **Components**: User menu (Sign Out action)
- **Flow**: Click Sign Out → Session cleared → Redirect to sign-in

**US-028: Resume action after login**
- **View**: All views
- **Components**: Return URL parameter handling
- **Flow**: Unauthenticated action → Sign in → Return to intended destination

### 7.3 Card Management Stories (US-008 to US-012, US-021, US-023, US-030)

**US-008: Preserve pending proposals across login/refresh**
- **View**: Generate/Review
- **Components**: PendingProposalsProvider (localStorage sync)
- **Flow**: Refresh/login → Proposals restored from localStorage

**US-009: Manual create a card**
- **View**: Generate/Review
- **Components**: ManualCardForm, CharacterCounter
- **Flow**: Fill form → Validate → Save → Card created

**US-010: Browse saved cards**
- **View**: My Cards
- **Components**: CardList, CardItem, PaginationControls/InfiniteScrollLoader
- **Flow**: Navigate to My Cards → Cards displayed with pagination

**US-011: Edit a saved card**
- **View**: My Cards
- **Components**: CardEditor (inline/modal), CharacterCounter
- **Flow**: Click Edit → Modify → Save → Card updated

**US-012: Delete a saved card**
- **View**: My Cards
- **Components**: DeleteConfirmationDialog, CardItem (Delete button)
- **Flow**: Click Delete → Confirm → Card removed

**US-021: Duplicate cards allowed**
- **View**: My Cards, Generate/Review
- **Components**: Card creation/acceptance (no deduplication)
- **Flow**: Save duplicate → Success (no warning)

**US-023: Validation of server-side schema**
- **View**: All card creation/editing views
- **Components**: CharacterCounter, validation logic
- **Flow**: Invalid input → API returns 400 → Error displayed

**US-030: Input sanitation**
- **View**: All views with user input
- **Components**: Input sanitization utility
- **Flow**: User input → Sanitized → Stored/Displayed safely

### 7.4 Practice Stories (US-013 to US-016)

**US-013: Start a practice session**
- **View**: Practice
- **Components**: PracticeSession, EmptyState
- **Flow**: Navigate to Practice → Cards fetched → Shuffled → Session starts

**US-014: Reveal back of card**
- **View**: Practice
- **Components**: PracticeCard (Reveal button, keyboard shortcut)
- **Flow**: Click Reveal or press Space → Back revealed

**US-015: Mark correct/incorrect**
- **View**: Practice
- **Components**: PracticeCard (Correct/Incorrect buttons, keyboard shortcuts)
- **Flow**: Mark response → Next card displayed

**US-016: See session summary**
- **View**: Practice
- **Components**: SessionSummaryModal
- **Flow**: Session complete → Summary modal → Statistics displayed

### 7.5 Analytics and Measurement Stories (US-025)

**US-025: Analytics events**
- **View**: All views
- **Components**: AnalyticsProvider (trackEvent)
- **Flow**: User action → Event queued → Batched sending → Analytics recorded

### 7.6 UX Enhancement Stories (US-026, US-027)

**US-026: Character counters visible**
- **View**: Generate/Review, My Cards
- **Components**: CharacterCounter
- **Flow**: Edit text → Counter updates in real-time

**US-027: Empty states**
- **View**: All views
- **Components**: EmptyState (variants)
- **Flow**: No data → Empty state displayed with guidance

## 8. Requirements to UI Elements Mapping

### 8.1 Functional Requirements Mapping

**FR-1: AI flashcard generation**
- TextInputArea (10,000 char limit with counter)
- GenerateButton (disabled states, loading)
- ProposalList (displays proposals)
- ErrorBanner (quota/network errors)

**FR-2: Proposal review and inline editing**
- CardProposalEditor (editable fields, validation)
- CharacterCounter (real-time feedback)
- Accept/Reject buttons

**FR-3: Manual card creation**
- ManualCardForm (front/back fields, validation)
- CharacterCounter (shared component)

**FR-4: Persistence model**
- Accept button (triggers API call)
- Save button (manual creation)
- PendingProposalsProvider (client-side only until accept)

**FR-5: Authentication and authorization**
- Sign In/Sign Up pages
- Authentication guard middleware
- User menu (sign out)

**FR-6: Pending state handling**
- PendingProposalsProvider (localStorage sync)
- ProposalList (displays pending proposals)

**FR-7: Practice mode**
- PracticeSession (session management)
- PracticeCard (card display and interaction)
- SessionSummaryModal (completion summary)

**FR-8: Error handling and empty states**
- ErrorBanner (quota/network errors)
- EmptyState (no proposals, no cards, practice complete)
- Toast (success/error notifications)

**FR-9: Analytics and measurement**
- AnalyticsProvider (event tracking)
- Automatic event creation on accept/manual_create/practice_done

**FR-10: Non-functional constraints**
- CharacterCounter (English-only validation)
- LoadingSkeleton (10-second typical latency)
- Keyboard shortcuts (practice mode)
- Input sanitization (XSS prevention)

### 8.2 User Experience Requirements

**Speed to Value:**
- Generate/Review as default landing (immediate access to main feature)
- Optimistic UI updates (instant feedback)
- Client-side shuffling (fast practice start)

**Minimal UX:**
- Three-view navigation (simple structure)
- Single default collection (no deck management)
- No Accept All (individual control)

**Quality Constraints:**
- CharacterCounter (strict limits with visual feedback)
- Inline validation (immediate feedback)
- Server-side validation (enforced limits)

## 9. User Pain Points and Solutions

### 9.1 Pain Point: Losing Pending Proposals

**Problem:** User refreshes page or logs out, loses pending proposals.

**Solution:**
- PendingProposalsProvider syncs to localStorage
- Proposals persist across refreshes and authentication sessions
- Graceful fallback to in-memory if localStorage quota exceeded

### 9.2 Pain Point: Slow AI Generation

**Problem:** User waits for AI generation with no feedback.

**Solution:**
- LoadingSkeleton with progress indicator
- Cancellation support (optional)
- Typical 10-second latency with clear loading state

### 9.3 Pain Point: Accidental Card Deletion

**Problem:** User accidentally deletes card.

**Solution:**
- DeleteConfirmationDialog requires explicit confirmation
- Clear warning message
- No undo in MVP (future enhancement)

### 9.4 Pain Point: Unclear Validation Errors

**Problem:** User doesn't understand why Accept is disabled.

**Solution:**
- CharacterCounter with color-coded feedback
- Inline validation errors with specific messages
- Real-time validation during typing

### 9.5 Pain Point: Losing Practice Session Progress

**Problem:** User navigates away during practice, loses progress.

**Solution:**
- NavigationWarning prevents accidental navigation
- Clear warning message
- User can confirm to leave or cancel to continue

### 9.6 Pain Point: Mobile Editing Difficulty

**Problem:** Inline editing on mobile is cramped and difficult.

**Solution:**
- BottomSheetModal for mobile card editing
- Full-screen editing experience
- Touch-optimized controls

### 9.7 Pain Point: Email Verification Confusion

**Problem:** User doesn't know what to do after sign-up.

**Solution:**
- Clear email verification check page
- Helpful messaging with email display
- Resend option with success feedback

### 9.8 Pain Point: Quota Errors Unclear

**Problem:** User doesn't understand why generation failed.

**Solution:**
- Prominent ErrorBanner with clear message
- Suggestion to use manual creation
- Retry disabled to prevent rapid retries

## 10. Accessibility Considerations

### 10.1 Keyboard Navigation

- All interactive elements keyboard accessible
- Tab order follows visual flow
- Enter/Space activate buttons
- Escape closes modals and cancels actions
- Practice mode keyboard shortcuts (Space, 1/C, 2/I, Esc)

### 10.2 Screen Reader Support

- ARIA labels for all form inputs and buttons
- ARIA live regions for dynamic content (character counters, errors)
- Descriptive error messages
- Semantic HTML structure (headings, landmarks)
- Alt text for icons and images (if any)

### 10.3 Visual Accessibility

- Color contrast compliance (WCAG AA minimum)
- Character counter uses color + text (not color alone)
- Focus indicators visible and clear
- Text size minimum 16px (prevents iOS zoom)
- High contrast mode support

### 10.4 Focus Management

- Focus trap in modals
- Focus return after modal close
- Focus management in practice mode (card transitions)
- Skip links for main content (optional, recommended)

## 11. Security Considerations

### 11.1 Input Sanitization

- All user input sanitized before storage
- HTML/JavaScript escaping for display
- XSS prevention through proper escaping
- No raw source text in analytics or logs

### 11.2 Authentication Security

- JWT tokens stored in-memory only (not localStorage)
- Automatic token refresh
- Secure token transmission (HTTPS)
- Session expiration handling

### 11.3 Authorization

- Authentication required for all views (except auth pages)
- User can only access their own data (RLS enforced)
- API calls include Authorization header
- Return URL validation (prevent open redirect)

### 11.4 Data Privacy

- No raw source text stored server-side
- Analytics events exclude sensitive data
- User data isolated by user_id (RLS)
- Soft delete for data recovery (not exposed in MVP)

## 12. Performance Optimization

### 12.1 Client-Side Optimizations

- Client-side Fisher-Yates shuffling (avoids expensive DB queries)
- React Query caching with background refetching
- Debounced validation (reduces computation)
- Optimistic UI updates (instant feedback)
- Loading skeletons (better perceived performance)

### 12.2 Server-Side Optimizations

- Server-side pagination (reduces payload size)
- Database indexes for efficient queries
- Batch analytics event sending (reduces API calls)
- Connection pooling (Supabase)

### 12.3 Responsive Optimizations

- Viewport-based feature detection (pagination vs. infinite scroll)
- Conditional rendering (desktop vs. mobile components)
- Lazy loading for non-critical components (optional)
- Image optimization (if images added in future)

## 13. Future Enhancements (Out of Scope for MVP)

- Advanced spaced-repetition algorithms (SM-2)
- Deck/collection management
- Import formats (PDF, DOCX)
- Sharing sets with other users
- Mobile apps
- Accept All action
- Export cards (JSON)
- Account deletion flow
- Undo for card deletion
- User preference toggles (pagination vs. infinite scroll)
- Practice session persistence
- Advanced analytics dashboard

---

This UI architecture document provides a comprehensive foundation for implementing the Lang Memo user interface according to the PRD, API plan, and planning session decisions. All views, components, user journeys, and considerations are designed to meet the MVP requirements while maintaining flexibility for future enhancements.

