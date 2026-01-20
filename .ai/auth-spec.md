# Authentication Architecture Specification - Lang Memo

## Document Overview

This specification defines the architecture for implementing user registration, login, password recovery, and authentication flow integration in the Lang Memo application. The specification is based on requirements from the PRD (`.ai/prd.md`) and uses the tech stack defined in `.ai/tech-stack.md`.

**Key Requirements:**
- Email/password authentication with email verification (Supabase Auth)
- All application usage requires authentication (no anonymous access)
- Email verification required before sign-in
- Password recovery functionality
- Seamless redirect after authentication to intended destination
- Preservation of pending proposals across authentication flows

**Tech Stack:**
- Astro 5 (SSR mode with `output: "server"`)
- React 19 (for interactive components)
- TypeScript 5
- Supabase Auth (email/password with email verification)
- Tailwind 4 + Shadcn/ui (for UI components)

---

## 1. USER INTERFACE ARCHITECTURE

### 1.1 Page Structure and Routing

#### 1.1.1 Public Authentication Pages

**Location:** `src/pages/auth/`

All authentication pages are Astro pages that render React components for interactive forms. Pages use server-side rendering to check authentication state and handle redirects.

**Pages to Create:**

1. **`src/pages/auth/sign-in.astro`**
   - Purpose: User sign-in form
   - Route: `/auth/sign-in`
   - Behavior:
     - If user is already authenticated, redirect to return URL (from query param `returnUrl`) or `/`
     - Renders `SignInForm` React component (client-side interactive)
     - Accepts optional `returnUrl` query parameter for post-login redirect
     - Accepts optional `email` query parameter to pre-fill email field
     - Displays error messages from query parameters (e.g., `?error=unverified&email=user@example.com`)

2. **`src/pages/auth/sign-up.astro`**
   - Purpose: User registration form
   - Route: `/auth/sign-up`
   - Behavior:
     - If user is already authenticated, redirect to `/`
     - Renders `SignUpForm` React component
     - Accepts optional `returnUrl` query parameter (preserved through sign-up flow)
     - On successful sign-up, redirects to `/auth/verify/check` with email in query params

3. **`src/pages/auth/verify/check.astro`**
   - Purpose: Email verification instruction page
   - Route: `/auth/verify/check`
   - Behavior:
     - Displays email address from query parameter
     - Shows instructions to check email inbox
     - Provides "Resend verification email" button
     - Link to return to sign-in page
     - Static content (no form submission)

4. **`src/pages/auth/verify/success.astro`**
   - Purpose: Email verification success confirmation
   - Route: `/auth/verify/success`
   - Behavior:
     - Displayed after user clicks verification link in email
     - Shows success message
     - "Sign in" button linking to `/auth/sign-in`
     - Static content

5. **`src/pages/auth/verify/error.astro`**
   - Purpose: Email verification error handling
   - Route: `/auth/verify/error`
   - Behavior:
     - Displayed when verification link is invalid/expired
     - Shows error message
     - Provides "Resend verification email" option
     - Link to return to sign-in page

6. **`src/pages/auth/reset-password.astro`**
   - Purpose: Password reset request form
   - Route: `/auth/reset-password`
   - Behavior:
     - Renders `ResetPasswordRequestForm` React component
     - Accepts email input
     - On submission, sends password reset email via Supabase
     - Shows success message with instructions
     - Link to return to sign-in page

7. **`src/pages/auth/reset-password/confirm.astro`**
   - Purpose: Password reset confirmation form (accessed via email link)
   - Route: `/auth/reset-password/confirm`
   - Behavior:
     - Validates token from query parameters (`token`, `type`)
     - If token invalid/expired, redirects to `/auth/reset-password` with error
     - Renders `ResetPasswordConfirmForm` React component
     - Accepts new password input
     - On successful reset, redirects to `/auth/sign-in` with success message

#### 1.1.2 Protected Application Pages

**Existing Pages Requiring Updates:**

1. **`src/pages/index.astro`** (Generate/Review view)
   - Current: Renders `GenerateReviewView` component
   - Update Required:
     - Add authentication check in server-side code
     - If unauthenticated, redirect to `/auth/sign-in?returnUrl=/`
     - Ensure `AuthProvider` wraps the view (already present in `GenerateReviewView`)

2. **Future Protected Pages** (to be created):
   - `/cards` - My Cards view
   - `/practice` - Practice mode view
   - All should follow same pattern: check auth in Astro page, redirect if needed

### 1.2 Component Architecture

#### 1.2.1 Authentication Form Components

**Location:** `src/components/auth/`

All form components are React components using Shadcn/ui components for consistent styling. They use the `useAuth` hook from `AuthProvider` for authentication operations.

**Components to Create:**

1. **`SignInForm.tsx`**
   - Purpose: Sign-in form with email and password fields
   - Props:
     - `returnUrl?: string` - URL to redirect after successful sign-in
     - `prefilledEmail?: string` - Pre-fill email field
   - State Management:
     - Email input (controlled)
     - Password input (controlled)
     - Loading state (during sign-in request)
     - Error state (error message string or null)
   - Validation:
     - Email: required, valid email format
     - Password: required, minimum length (client-side only, server validates)
   - Behavior:
     - Calls `signIn(email, password)` from `useAuth` hook
     - On success: Navigate to `returnUrl` or `/` using client-side navigation
     - On error: Display error message
       - If error indicates unverified email: Show message with "Resend verification email" button
       - Other errors: Display generic error message
     - Disable submit button during loading
     - Show loading spinner on submit button during request
   - UI Elements:
     - Email input field (type="email")
     - Password input field (type="password")
     - "Sign in" submit button
     - "Forgot password?" link → `/auth/reset-password`
     - "Don't have an account? Sign up" link → `/auth/sign-up?returnUrl={returnUrl}`
     - Error banner (conditional, above form)
     - Character counters not needed (no length limits)

2. **`SignUpForm.tsx`**
   - Purpose: Registration form with email, password, and password confirmation
   - Props:
     - `returnUrl?: string` - URL to redirect after successful sign-up and verification
   - State Management:
     - Email input (controlled)
     - Password input (controlled)
     - Password confirmation input (controlled)
     - Loading state
     - Error state
   - Validation:
     - Email: required, valid email format
     - Password: required, minimum length (e.g., 8 characters), strength indicators optional
     - Password confirmation: required, must match password
   - Behavior:
     - Calls `signUp(email, password)` from `useAuth` hook
     - On success: Navigate to `/auth/verify/check?email={email}&returnUrl={returnUrl}`
     - On error: Display error message
       - Email already exists: Show specific message
       - Weak password: Show validation error
       - Other errors: Display generic error message
     - Disable submit button during loading
   - UI Elements:
     - Email input field
     - Password input field with strength indicator (optional)
     - Password confirmation input field
     - "Sign up" submit button
     - "Already have an account? Sign in" link → `/auth/sign-in?returnUrl={returnUrl}`
     - Error banner (conditional)

3. **`ResetPasswordRequestForm.tsx`**
   - Purpose: Form to request password reset email
   - Props: None
   - State Management:
     - Email input (controlled)
     - Loading state
     - Success state (boolean)
     - Error state
   - Validation:
     - Email: required, valid email format
   - Behavior:
     - Calls Supabase `resetPasswordForEmail(email)` method
     - On success: Show success message with instructions
     - On error: Display error message
     - Disable submit button during loading
   - UI Elements:
     - Email input field
     - "Send reset link" submit button
     - Success message (conditional, replaces form on success)
     - Error banner (conditional)
     - "Back to sign in" link → `/auth/sign-in`

4. **`ResetPasswordConfirmForm.tsx`**
   - Purpose: Form to set new password after clicking reset link
   - Props:
     - `token: string` - Password reset token from URL
   - State Management:
     - New password input (controlled)
     - Password confirmation input (controlled)
     - Loading state
     - Error state
   - Validation:
     - Password: required, minimum length
     - Password confirmation: required, must match password
   - Behavior:
     - Calls Supabase `updateUser({ password })` method with token context
     - On success: Navigate to `/auth/sign-in?message=password_reset_success`
     - On error: Display error message (token expired/invalid)
     - Disable submit button during loading
   - UI Elements:
     - New password input field
     - Password confirmation input field
     - "Reset password" submit button
     - Error banner (conditional)

5. **`ResendVerificationEmailButton.tsx`**
   - Purpose: Button to resend verification email
   - Props:
     - `email: string` - Email address to resend verification to
   - State Management:
     - Loading state
     - Success state
     - Error state
   - Behavior:
     - Calls Supabase `resend({ type: 'signup', email })` method
     - On success: Show success toast/message
     - On error: Display error message
   - UI Elements:
     - Button with loading state
     - Success message (toast or inline)

#### 1.2.2 Layout Components

**Location:** `src/components/auth/` or `src/components/layout/`

1. **`AuthLayout.astro`** (Optional)
   - Purpose: Shared layout for authentication pages
   - Behavior:
     - Provides consistent styling and structure
     - Includes logo/branding
     - Centers content on page
     - Responsive design (mobile-first)
   - Usage: Wrap authentication pages with this layout

2. **`AppLayout.astro`** (Update existing `Layout.astro` or create new)
   - Purpose: Layout for authenticated application pages
   - Behavior:
     - Includes navigation bar with user menu
     - Shows user email/name
     - Includes "Sign out" button
     - Responsive navigation (hamburger menu on mobile)
   - Components:
     - `NavigationBar.tsx` - Top navigation with user menu
     - `UserMenu.tsx` - Dropdown menu with user info and sign out

#### 1.2.3 Navigation Components

**Location:** `src/components/layout/`

1. **`NavigationBar.tsx`**
   - Purpose: Top navigation bar for authenticated pages
   - Props: None (uses `useAuth` hook internally)
   - Behavior:
     - Shows logo/brand (links to `/`)
     - Navigation links: "Generate", "My Cards", "Practice"
     - User menu on right (desktop) or hamburger menu (mobile)
     - Highlights active route
   - Responsive:
     - Desktop: Horizontal navigation
     - Mobile: Hamburger menu

2. **`UserMenu.tsx`**
   - Purpose: User dropdown menu
   - Props: None (uses `useAuth` hook)
   - Behavior:
     - Shows user email
     - "Sign out" button (calls `signOut()` from `useAuth`)
     - On sign out: Redirect to `/auth/sign-in`
   - UI: Shadcn/ui DropdownMenu component

### 1.3 Authentication State Management

#### 1.3.1 AuthProvider Updates

**File:** `src/components/providers/AuthProvider.tsx`

**Current State:** Already implements basic sign-in, sign-up, sign-out functionality.

**Required Updates:**

1. **Add Password Reset Methods:**
   - `resetPasswordForEmail(email: string): Promise<{ error: Error | null }>`
   - `updatePassword(newPassword: string, token?: string): Promise<{ error: Error | null }>`
   - `resendVerificationEmail(email: string): Promise<{ error: Error | null }>`
   - **Note:** Password recovery is a standard auth feature. While not explicitly mentioned in PRD, it's essential for user experience and is implicitly required for a production auth system.

2. **Add Email Verification Check:**
   - `checkEmailVerification(): Promise<{ verified: boolean; error: Error | null }>`
   - Expose `user.email_confirmed_at` or similar property in context
   - Required per PRD FR-5: "verification email is sent and must be confirmed before sign-in"

3. **Add Return URL Handling:**
   - Store return URL in sessionStorage/localStorage when redirecting to sign-in
   - Retrieve and use after successful authentication
   - **Critical for US-007 and US-028:** Must preserve returnUrl to allow users to "return to intended destination" and "continue pending action"

4. **Error Handling Improvements:**
   - Map Supabase auth errors to user-friendly messages
   - Handle specific error codes:
     - `email_not_confirmed` - User needs to verify email (per US-031)
     - `invalid_credentials` - Wrong email/password
     - `email_already_registered` - Email already in use
     - `weak_password` - Password doesn't meet requirements
     - `token_expired` - Password reset token expired

#### 1.3.2 Pending Proposals Preservation

**File:** `src/components/providers/PendingProposalsProvider.tsx`

**Current State:** Already uses localStorage to persist pending proposals.

**Required Behavior:**
- Pending proposals persist across authentication flows
- No changes needed (already implemented via localStorage)
- Ensure proposals are restored after sign-in completes

### 1.4 Validation and Error Handling

#### 1.4.1 Client-Side Validation

**Email Validation:**
- Required field
- Valid email format (RFC 5322 compliant, use browser `type="email"` and additional regex if needed)
- Maximum length: 255 characters (standard email limit)

**Password Validation:**
- Required field
- Minimum length: 8 characters (Supabase default)
- Optional: Strength indicators (weak/medium/strong)
- Password confirmation must match password exactly

**Error Messages:**

1. **Sign In Errors:**
   - "Email is required"
   - "Please enter a valid email address"
   - "Password is required"
   - "Invalid email or password" (for security, don't specify which is wrong)
   - "Please verify your email address before signing in. Check your inbox for the verification link."
   - "An error occurred. Please try again."

2. **Sign Up Errors:**
   - "Email is required"
   - "Please enter a valid email address"
   - "This email is already registered"
   - "Password is required"
   - "Password must be at least 8 characters"
   - "Passwords do not match"
   - "An error occurred. Please try again."

3. **Password Reset Errors:**
   - "Email is required"
   - "Please enter a valid email address"
   - "Password reset link has expired. Please request a new one."
   - "Invalid reset token"
   - "Password must be at least 8 characters"
   - "Passwords do not match"
   - "An error occurred. Please try again."

4. **Email Verification Errors:**
   - "Verification link has expired. Please request a new one."
   - "Invalid verification link"
   - "An error occurred. Please try again."

#### 1.4.2 Server-Side Validation

**Location:** `src/lib/validations/auth.ts` (to be created)

**Validation Schemas (using Zod):**

1. **`signInSchema`**
   - `email`: string, email format, required
   - `password`: string, min 1 character, required

2. **`signUpSchema`**
   - `email`: string, email format, required, max 255 characters
   - `password`: string, min 8 characters, required
   - `passwordConfirmation`: string, must match password

3. **`resetPasswordRequestSchema`**
   - `email`: string, email format, required

4. **`resetPasswordConfirmSchema`**
   - `password`: string, min 8 characters, required
   - `passwordConfirmation`: string, must match password
   - `token`: string, required (from URL)

### 1.5 User Flow Scenarios

#### 1.5.1 New User Registration Flow

1. User visits `/` (unauthenticated)
2. Middleware redirects to `/auth/sign-in?returnUrl=/`
3. User clicks "Sign up" link → `/auth/sign-up?returnUrl=/`
4. User fills form and submits
5. On success: Redirect to `/auth/verify/check?email={email}&returnUrl=/`
6. User receives email and clicks verification link
7. Supabase callback redirects to `/auth/verify/success`
8. User clicks "Sign in" → `/auth/sign-in?returnUrl=/`
9. User signs in → Redirect to `/` (returnUrl)
10. User can now use application features

#### 1.5.2 Returning User Sign-In Flow

1. User visits `/` (unauthenticated)
2. Middleware redirects to `/auth/sign-in?returnUrl=/`
3. User enters credentials and submits
4. On success: Redirect to `/` (returnUrl)
5. User can use application features

#### 1.5.3 Unverified Email Sign-In Attempt

1. User attempts to sign in with unverified email
2. Supabase returns error indicating email not verified
3. Form displays error: "Please verify your email address before signing in."
4. "Resend verification email" button appears
5. User clicks button → Verification email resent
6. User verifies email → Can now sign in

#### 1.5.4 Password Reset Flow

1. User clicks "Forgot password?" on sign-in page → `/auth/reset-password`
2. User enters email and submits
3. On success: Success message displayed
4. User receives email with reset link
5. User clicks link → `/auth/reset-password/confirm?token={token}&type=recovery`
6. User enters new password and confirms
7. On success: Redirect to `/auth/sign-in?message=password_reset_success`
8. User signs in with new password

#### 1.5.5 Session Expiration During Use

1. User is using application (e.g., generating cards, editing proposals)
2. Session expires (token refresh fails)
3. Next API call returns 401 Unauthorized OR middleware detects expired session
4. Client detects 401 → Redirect to `/auth/sign-in?returnUrl={currentUrl}`
   - OR middleware redirects server-side if detected before API call
5. User signs in → Redirects back to original page (returnUrl)
6. Pending proposals preserved in localStorage (per FR-6 and US-008)
7. User edits preserved in component state (if any) - state restored from localStorage
8. User can continue where they left off (per US-028: "original action completes without losing edits")

---

## 2. BACKEND LOGIC

### 2.1 API Endpoints

#### 2.1.1 Authentication Endpoints (Supabase Client-Side)

**Note:** Most authentication operations use Supabase client-side SDK directly. No custom API endpoints needed for basic auth operations. However, server-side validation and session management may require custom endpoints.

**Optional Custom Endpoints (if needed):**

1. **`POST /api/auth/verify-email`** (Optional)
   - Purpose: Server-side email verification check
   - Authentication: Required (Bearer token)
   - Request Body: None
   - Response: `{ verified: boolean; email: string }`
   - Use Case: Check verification status server-side

2. **`POST /api/auth/resend-verification`** (Optional)
   - Purpose: Server-side resend verification email
   - Authentication: Required (Bearer token)
   - Request Body: `{ email: string }`
   - Response: `{ success: boolean; message: string }`
   - Use Case: Resend verification from server context

**Primary Authentication Flow:**
- All authentication operations (sign-in, sign-up, password reset) use Supabase client-side SDK
- No custom API endpoints required for MVP
- Server-side endpoints only need to validate authentication tokens (already implemented in `getAuthenticatedUser`)

#### 2.1.2 Protected Endpoints Updates

**Existing Endpoints:** `POST /api/cards/generate`, `GET /api/cards`, etc.

**Current State:** Already use `getAuthenticatedUser(context)` for authentication.

**No Changes Required:** Existing authentication mechanism is sufficient.

### 2.2 Middleware Updates

**File:** `src/middleware/index.ts`

**Current State:** Sets up Supabase client in `context.locals.supabase`.

**Required Updates:**

1. **Add Authentication Guard:**
   - Check authentication status for protected routes
   - Protected routes: `/`, `/cards`, `/practice` (and all routes except `/auth/*`)
   - Public routes: `/auth/*` (sign-in, sign-up, verify, reset-password)
   - If unauthenticated user accesses protected route:
     - Extract current URL as `returnUrl`
     - Redirect to `/auth/sign-in?returnUrl={encodedUrl}`
   - If authenticated user accesses `/auth/sign-in` or `/auth/sign-up`:
     - Redirect to `/` (or returnUrl if present)

2. **Session Validation:**
   - Extract session token from cookies (Supabase stores session in cookies)
   - Validate token using Supabase client
   - Set `context.locals.user` if authenticated
   - Set `context.locals.isAuthenticated: boolean`

3. **Email Verification Check:**
   - PRD FR-5 states: "verification email is sent and must be confirmed before sign-in"
   - Supabase enforces this at the auth level (sign-in fails if email not verified)
   - Middleware check is redundant since Supabase prevents unverified sign-in
   - However, middleware can provide better UX by detecting unverified state and redirecting with helpful message
   - **Decision:** Implement optional check for better UX, but rely on Supabase enforcement for security

**Middleware Structure:**

```typescript
export const onRequest = defineMiddleware(async (context, next) => {
  // 1. Set up Supabase client (existing logic)
  
  // 2. Check if route is public (starts with /auth/)
  const isPublicRoute = context.url.pathname.startsWith('/auth/');
  
  // 3. If not public route, check authentication
  if (!isPublicRoute) {
    const session = await getSessionFromRequest(context);
    if (!session) {
      // Redirect to sign-in with returnUrl
      return redirect(`/auth/sign-in?returnUrl=${encodeURIComponent(context.url.pathname)}`);
    }
    context.locals.user = session.user;
    context.locals.isAuthenticated = true;
  }
  
  // 4. If public route and authenticated, redirect away
  if (isPublicRoute && context.locals.isAuthenticated) {
    const returnUrl = context.url.searchParams.get('returnUrl') || '/';
    return redirect(returnUrl);
  }
  
  return next();
});
```

**Helper Function:**

```typescript
async function getSessionFromRequest(context: APIContext): Promise<Session | null> {
  // Extract session from Supabase cookies
  // Use context.locals.supabase.auth.getSession()
  // Return session or null
}
```

### 2.3 Server-Side Rendering (SSR) Considerations

**Astro Configuration:** `astro.config.mjs` uses `output: "server"` and `adapter: node({ mode: "standalone" })`.

**SSR Behavior:**

1. **Authentication Pages:**
   - Render static content (forms) server-side
   - React components hydrate client-side for interactivity
   - Check authentication state server-side to prevent unnecessary redirects
   - Pre-fill email from query parameters server-side (if provided)

2. **Protected Pages:**
   - Check authentication server-side before rendering
   - Redirect unauthenticated users server-side (301/302 redirect)
   - Pass user data to React components via props if needed
   - Avoid exposing sensitive data in initial HTML

3. **Session Management:**
   - Supabase stores session in HTTP-only cookies
   - Middleware reads cookies server-side
   - Session refresh handled automatically by Supabase client
   - No manual token management required

### 2.4 Input Validation

**Location:** `src/lib/validations/auth.ts` (to be created)

**Validation Functions:**

1. **`validateSignInInput(data: unknown)`**
   - Uses `signInSchema` (Zod)
   - Returns `{ success: boolean; data?: SignInInput; error?: ValidationError }`

2. **`validateSignUpInput(data: unknown)`**
   - Uses `signUpSchema` (Zod)
   - Returns `{ success: boolean; data?: SignUpInput; error?: ValidationError }`

3. **`validateResetPasswordRequest(data: unknown)`**
   - Uses `resetPasswordRequestSchema` (Zod)
   - Returns validation result

4. **`validateResetPasswordConfirm(data: unknown)`**
   - Uses `resetPasswordConfirmSchema` (Zod)
   - Returns validation result

**Type Definitions:**

```typescript
interface SignInInput {
  email: string;
  password: string;
}

interface SignUpInput {
  email: string;
  password: string;
  passwordConfirmation: string;
}

interface ResetPasswordRequestInput {
  email: string;
}

interface ResetPasswordConfirmInput {
  password: string;
  passwordConfirmation: string;
  token: string;
}
```

### 2.5 Exception Handling

**Location:** `src/lib/errors/auth-errors.ts` (to be created)

**Error Types:**

1. **`AuthenticationError`** (already exists in `src/lib/auth.ts`)
   - Used for missing/invalid tokens
   - HTTP 401 Unauthorized

2. **`EmailVerificationError`**
   - Used when email not verified
   - HTTP 403 Forbidden (or 401)

3. **`ValidationError`**
   - Used for invalid input data
   - HTTP 400 Bad Request
   - Includes validation details

4. **`PasswordResetError`**
   - Used for invalid/expired reset tokens
   - HTTP 400 Bad Request

**Error Response Format:**

```typescript
interface AuthErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, string>;
  };
}
```

**Error Codes:**

- `AUTH_REQUIRED` - Authentication required
- `EMAIL_NOT_VERIFIED` - Email not verified
- `INVALID_CREDENTIALS` - Invalid email/password
- `EMAIL_ALREADY_REGISTERED` - Email already in use
- `WEAK_PASSWORD` - Password doesn't meet requirements
- `TOKEN_EXPIRED` - Token expired
- `TOKEN_INVALID` - Invalid token
- `VALIDATION_ERROR` - Input validation failed

---

## 3. AUTHENTICATION SYSTEM

### 3.1 Supabase Auth Integration

#### 3.1.1 Supabase Client Configuration

**File:** `src/db/supabase.client.ts`

**Current State:** Creates Supabase client with URL and anon key.

**Required Updates:** None (current implementation is sufficient).

**File:** `src/components/providers/AuthProvider.tsx`

**Current State:** Creates client-side Supabase client with auth configuration.

**Configuration:**
```typescript
{
  auth: {
    persistSession: true,        // Store session in localStorage/cookies
    autoRefreshToken: true,      // Automatically refresh expired tokens
    detectSessionInUrl: true,    // Detect auth callbacks in URL
  }
}
```

**No Changes Required:** Current configuration handles session persistence and token refresh.

#### 3.1.2 Authentication Methods

**Sign Up:**
```typescript
await supabase.auth.signUp({
  email: string,
  password: string,
  options: {
    emailRedirectTo: `${window.location.origin}/auth/verify/success`
  }
})
```

**Sign In:**
```typescript
await supabase.auth.signInWithPassword({
  email: string,
  password: string
})
```

**Sign Out:**
```typescript
await supabase.auth.signOut()
```

**Password Reset Request:**
```typescript
await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${window.location.origin}/auth/reset-password/confirm`
})
```

**Password Reset Confirm:**
```typescript
await supabase.auth.updateUser({
  password: newPassword
})
```

**Resend Verification Email:**
```typescript
await supabase.auth.resend({
  type: 'signup',
  email: email
})
```

**Get Current Session:**
```typescript
const { data: { session } } = await supabase.auth.getSession()
```

**Get Current User:**
```typescript
const { data: { user } } = await supabase.auth.getUser()
```

#### 3.1.3 Email Verification Flow

**Supabase Configuration:**
- Email verification enabled by default
- Verification email sent automatically on sign-up
- Email template customizable in Supabase dashboard
- Verification link includes token and redirect URL

**Flow:**
1. User signs up → Supabase sends verification email
2. Email contains link: `{supabaseUrl}/auth/v1/verify?token={token}&type=signup&redirect_to={redirectUrl}`
3. User clicks link → Supabase verifies token
4. Supabase redirects to `redirect_to` URL (configured as `/auth/verify/success`)
5. Application shows success page

**Error Handling:**
- Invalid/expired token → Redirect to `/auth/verify/error`
- Token already used → Show appropriate message

#### 3.1.4 Password Recovery Flow

**Supabase Configuration:**
- Password recovery enabled by default
- Recovery email sent on request
- Email template customizable in Supabase dashboard
- Recovery link includes token and redirect URL

**Flow:**
1. User requests password reset → Supabase sends recovery email
2. Email contains link: `{supabaseUrl}/auth/v1/verify?token={token}&type=recovery&redirect_to={redirectUrl}`
3. User clicks link → Application validates token and shows reset form
4. User submits new password → Supabase updates password
5. Application redirects to sign-in page

**Error Handling:**
- Invalid/expired token → Show error, allow new request
- Token already used → Show error, allow new request

### 3.2 Session Management

#### 3.2.1 Session Storage

**Supabase Default Behavior:**
- Stores session in HTTP-only cookies (server-side)
- Stores session in localStorage (client-side, for persistence)
- Session includes: `access_token`, `refresh_token`, `expires_at`, `user`

**Session Structure:**
```typescript
interface Session {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at: number;
  token_type: string;
  user: User;
}
```

#### 3.2.2 Token Refresh

**Automatic Refresh:**
- Supabase client automatically refreshes tokens before expiration
- Refresh happens client-side using `refresh_token`
- No manual intervention required

**Manual Refresh (if needed):**
```typescript
await supabase.auth.refreshSession()
```

#### 3.2.3 Session Expiration Handling

**Client-Side:**
- `onAuthStateChange` listener detects session expiration
- `AuthProvider` updates state when session expires
- Components can check `isAuthenticated` flag
- Redirect to sign-in when session expires

**Server-Side:**
- Middleware checks session validity
- API endpoints validate tokens using `getAuthenticatedUser`
- Returns 401 if token invalid/expired
- Client handles 401 and redirects to sign-in

### 3.3 Authentication State in Astro

#### 3.3.1 Server-Side Authentication Check

**Middleware Pattern:**
```typescript
// In middleware or page
const session = await context.locals.supabase.auth.getSession();
if (!session.data.session) {
  // Redirect to sign-in
}
```

**Page-Level Check:**
```typescript
// In Astro page
const session = await Astro.locals.supabase.auth.getSession();
if (!session.data.session) {
  return Astro.redirect('/auth/sign-in?returnUrl=' + encodeURIComponent(Astro.url.pathname));
}
```

#### 3.3.2 Client-Side Authentication State

**React Components:**
- Use `useAuth()` hook from `AuthProvider`
- Access `user`, `session`, `isAuthenticated`, `loading`
- React to auth state changes automatically

**Non-React Code:**
- Use Supabase client directly: `supabase.auth.getSession()`
- Listen to auth changes: `supabase.auth.onAuthStateChange()`

### 3.4 Security Considerations

#### 3.4.1 Password Security

- Passwords hashed by Supabase (bcrypt)
- Minimum length enforced (8 characters)
- No password storage in application code
- Password reset tokens expire (default: 1 hour)

#### 3.4.2 Token Security

- Access tokens expire (default: 1 hour)
- Refresh tokens stored securely
- Tokens transmitted over HTTPS only
- HTTP-only cookies prevent XSS attacks

#### 3.4.3 Email Verification

- Required before sign-in (enforced by Supabase)
- Verification tokens expire
- One-time use tokens
- Email templates customizable

#### 3.4.4 Rate Limiting

- Supabase enforces rate limits on auth endpoints
- Sign-up: Limited per IP
- Password reset: Limited per email
- Sign-in: Limited per IP/email

**Application-Level Rate Limiting (Optional):**
- Can be added in middleware for additional protection
- Not required for MVP (Supabase handles it)

### 3.5 Integration Points

#### 3.5.1 Protected API Endpoints

**Current Implementation:**
- `getAuthenticatedUser(context)` validates tokens
- Returns user object or throws `AuthenticationError`
- Used in all protected endpoints

**No Changes Required:** Current implementation is sufficient.

#### 3.5.2 Protected Pages

**Middleware Integration:**
- Middleware checks authentication before page render
- Redirects unauthenticated users
- Preserves return URL for post-login redirect

**Page-Level Integration:**
- Pages can check `Astro.locals.isAuthenticated`
- Pass user data to components if needed
- Handle server-side redirects

#### 3.5.3 Client-Side Components

**AuthProvider Integration:**
- All interactive components wrapped in `AuthProvider`
- Components use `useAuth()` hook
- Automatic re-render on auth state changes

**Navigation Integration:**
- Navigation components check `isAuthenticated`
- Show/hide menu items based on auth state
- Handle sign-out action

---

## 4. IMPLEMENTATION CHECKLIST

### 4.1 Frontend Components

- [ ] Create `src/components/auth/SignInForm.tsx`
- [ ] Create `src/components/auth/SignUpForm.tsx`
- [ ] Create `src/components/auth/ResetPasswordRequestForm.tsx`
- [ ] Create `src/components/auth/ResetPasswordConfirmForm.tsx`
- [ ] Create `src/components/auth/ResendVerificationEmailButton.tsx`
- [ ] Create `src/components/layout/NavigationBar.tsx`
- [ ] Create `src/components/layout/UserMenu.tsx`
- [ ] Create `src/components/auth/AuthLayout.astro` (optional)
- [ ] Update `src/components/layout/Layout.astro` or create `AppLayout.astro`

### 4.2 Pages

- [ ] Create `src/pages/auth/sign-in.astro`
- [ ] Create `src/pages/auth/sign-up.astro`
- [ ] Create `src/pages/auth/verify/check.astro`
- [ ] Create `src/pages/auth/verify/success.astro`
- [ ] Create `src/pages/auth/verify/error.astro`
- [ ] Create `src/pages/auth/reset-password.astro`
- [ ] Create `src/pages/auth/reset-password/confirm.astro`
- [ ] Update `src/pages/index.astro` (add auth check)

### 4.3 Backend Logic

- [ ] Update `src/middleware/index.ts` (add auth guard)
- [ ] Create `src/lib/validations/auth.ts` (validation schemas)
- [ ] Create `src/lib/errors/auth-errors.ts` (error types)
- [ ] Update `src/components/providers/AuthProvider.tsx` (add password reset methods)

### 4.4 Supabase Configuration

- [ ] Configure email templates in Supabase dashboard
- [ ] Set redirect URLs for email verification
- [ ] Set redirect URLs for password reset
- [ ] Configure email verification requirements
- [ ] Test email delivery (development/production)

### 4.5 Testing Scenarios

- [ ] New user registration flow
- [ ] Email verification flow
- [ ] Returning user sign-in
- [ ] Password reset flow
- [ ] Session expiration handling
- [ ] Protected route access (unauthenticated)
- [ ] Sign-out functionality
- [ ] Pending proposals preservation across auth flows
- [ ] Return URL preservation and redirect

---

## 5. OPEN QUESTIONS AND DECISIONS

### 5.1 Email Template Content

**Decision Required:**
- Exact copy for verification email
- Exact copy for password reset email
- Branding and styling of emails

**Recommendation:**
- Use Supabase default templates for MVP
- Customize templates post-MVP based on user feedback

### 5.2 Password Strength Requirements

**Decision Required:**
- Minimum password length (default: 8 characters)
- Password complexity requirements (uppercase, numbers, symbols)

**Recommendation:**
- Minimum 8 characters for MVP
- No complexity requirements initially (Supabase default)
- Add strength indicators in UI (optional)

### 5.3 Session Timeout

**Decision Required:**
- Access token expiration time (Supabase default: 1 hour)
- Refresh token expiration time (Supabase default: 30 days)

**Recommendation:**
- Use Supabase defaults for MVP
- Monitor user feedback and adjust if needed

### 5.4 Error Message Wording

**Decision Required:**
- Exact error messages for all scenarios
- Tone and style of error messages

**Recommendation:**
- Use user-friendly, non-technical language
- Provide actionable next steps in error messages
- Test error messages with users

### 5.5 Analytics Events

**PRD Reference:** FR-9 specifies analytics events: `generate, accept, reject, manual_create, practice_done`

**Decision Required:**
- Should auth events be tracked in analytics?
- Which events to track: sign_up, sign_in, sign_out, password_reset?

**Recommendation:**
- Auth events (sign_up, sign_in) are NOT explicitly listed in PRD FR-9
- However, tracking sign_up helps measure user acquisition (KPI support)
- Tracking sign_in helps measure retention
- **Decision:** Track sign_up and sign_in events for MVP, following same pattern as other events
- Follow PRD requirements: no PII other than userId, no raw source text
- Include timestamp, userId, and lightweight context (e.g., `{ origin: 'email' }`)

---

## 6. COMPATIBILITY NOTES

### 6.1 Existing Functionality

**No Breaking Changes:**
- All existing API endpoints continue to work
- Existing `AuthProvider` is extended, not replaced
- Existing `getAuthenticatedUser` function unchanged
- Pending proposals preservation already implemented

### 6.2 Development Mode

**DISABLE_AUTH Support:**
- Current `DISABLE_AUTH` flag continues to work
- Mock authentication state preserved
- Development workflow unchanged

### 6.3 Astro Configuration

**No Changes Required:**
- `astro.config.mjs` configuration sufficient
- SSR mode (`output: "server"`) required for auth checks
- Node adapter configuration unchanged

---

## 7. REFERENCES

- PRD: `.ai/prd.md` - Functional Requirements FR-5, FR-6, FR-9; User Stories US-007, US-008, US-018, US-028, US-031
- Tech Stack: `.ai/tech-stack.md` - Supabase Auth, Astro 5, React 19
- Supabase Auth Documentation: https://supabase.com/docs/guides/auth
- Astro Middleware Documentation: https://docs.astro.build/en/guides/middleware/
- Shadcn/ui Components: https://ui.shadcn.com/

## 8. PRD ALIGNMENT VERIFICATION

### 8.1 User Story Coverage

**US-007: Require login to use the app**
- ✅ Covered: Middleware redirects unauthenticated users to `/auth/sign-in`
- ✅ Covered: Return URL preserved and used after successful login
- ✅ Implementation: Section 2.2 (Middleware Updates)

**US-031: Sign up and verify email**
- ✅ Covered: Sign-up form with email/password (Section 1.2.1)
- ✅ Covered: Verification email sent automatically (Section 3.1.3)
- ✅ Covered: Verification required before sign-in (Section 3.1.3, PRD FR-5)
- ✅ Covered: Resend verification option (Section 1.2.1, ResendVerificationEmailButton)
- ✅ Implementation: Sections 1.1.1, 1.2.1, 3.1.3

**US-018: Sign out**
- ✅ Covered: Sign out functionality in AuthProvider (Section 1.3.1)
- ✅ Covered: UserMenu component with sign out button (Section 1.2.3)
- ✅ Covered: Pending proposals preserved in localStorage (Section 1.3.2, PRD FR-6)
- ✅ Implementation: Sections 1.2.3, 1.3.1

**US-008: Preserve pending proposals across login/refresh**
- ✅ Covered: localStorage persistence (Section 1.3.2)
- ✅ Covered: Proposals restored after re-authentication (Section 1.3.2)
- ✅ Implementation: Already implemented per PRD FR-6, no changes needed

**US-028: Resume action after login**
- ✅ Covered: Return URL handling (Sections 1.3.1, 2.2)
- ✅ Covered: Pending proposals preserved (Section 1.3.2)
- ⚠️ **Clarification Needed:** PRD states "original action completes without losing edits"
  - This refers to pending proposal edits in the UI
  - Edits are preserved via localStorage (pending proposals state)
  - After login, component state is restored from localStorage
  - **Implementation:** Ensure GenerateReviewContainer restores pending proposals and their edit state from localStorage after authentication

### 8.2 Functional Requirements Coverage

**FR-5: Authentication and authorization**
- ✅ All application usage requires authentication (Section 2.2, Middleware)
- ✅ Email/password with email verification (Section 3.1)
- ✅ Verification required before sign-in (Section 3.1.3)
- ✅ Return to intended destination after login (Sections 1.3.1, 2.2)
- ✅ Sign out functionality (Sections 1.2.3, 1.3.1)

**FR-6: Pending state handling**
- ✅ Pending proposals client-side only (Section 1.3.2)
- ✅ localStorage preservation (Section 1.3.2)
- ✅ No changes needed (already implemented)

### 8.3 Conflicts Resolved

1. **Proposal Limit:** 
   - ❌ **Conflict Found:** Auth-spec mentioned "up to 20 proposals"
   - ✅ **Resolved:** Updated to "at most 5 proposals" per PRD FR-1

2. **Password Recovery:**
   - ⚠️ **Not Explicit in PRD:** Password reset not mentioned in PRD
   - ✅ **Resolution:** Standard auth feature, included in spec with note that it's essential for production UX

3. **Return URL and Pending Actions:**
   - ⚠️ **Clarification Added:** PRD US-028 mentions "continue pending action"
   - ✅ **Resolution:** Clarified that this refers to pending proposal edits preserved in localStorage

### 8.4 Redundancies Identified

1. **Email Verification Enforcement:**
   - PRD FR-5 requires verification before sign-in
   - Supabase enforces this at auth level
   - Middleware check is redundant but improves UX
   - **Decision:** Keep optional middleware check for better error messages

2. **Analytics Events:**
   - PRD FR-9 lists specific events (generate, accept, reject, manual_create, practice_done)
   - Auth events not explicitly listed
   - **Decision:** Track auth events for KPI measurement, following same pattern

### 8.5 Implementation Feasibility Verification

**All User Stories Can Be Implemented:**

✅ **US-007:** Fully covered by middleware authentication guard (Section 2.2) and return URL handling (Sections 1.3.1, 1.5.2)

✅ **US-031:** Fully covered by:
- Sign-up form (Section 1.2.1, SignUpForm.tsx)
- Email verification flow (Section 3.1.3)
- Verification check page (Section 1.1.1)
- Resend verification button (Section 1.2.1, ResendVerificationEmailButton.tsx)
- Supabase enforces verification before sign-in (Section 3.1.3)

✅ **US-018:** Fully covered by:
- Sign out method in AuthProvider (Section 1.3.1)
- UserMenu component (Section 1.2.3)
- Pending proposals preservation (Section 1.3.2, already implemented)

✅ **US-008:** Already implemented per PRD FR-6, no changes needed (Section 1.3.2)

✅ **US-028:** Covered by:
- Return URL preservation (Sections 1.3.1, 2.2)
- Pending proposals in localStorage (Section 1.3.2)
- Component state restoration after login (Section 1.5.5)
- **Note:** Implementation must ensure GenerateReviewContainer restores edit state from localStorage

**Additional Features (Not in PRD but Standard):**

✅ **Password Recovery:** Included in spec as standard auth feature
- Reset password request form (Section 1.2.1, ResetPasswordRequestForm.tsx)
- Reset password confirmation (Section 1.2.1, ResetPasswordConfirmForm.tsx)
- Supabase password reset flow (Section 3.1.4)
- **Rationale:** Essential for production UX, standard in all auth systems

### 8.6 Missing Requirements from PRD

**None Identified:** All PRD requirements for authentication are covered in this specification.

**Additional Features Added:**
- Password recovery (standard auth feature, not explicitly in PRD)
- Resend verification email (implicitly required by US-031 acceptance criteria)

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-XX  
**Author:** AI Assistant  
**Status:** Specification Complete - Ready for Implementation
