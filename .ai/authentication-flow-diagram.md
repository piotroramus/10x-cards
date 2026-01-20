# Authentication Flow Diagram

This diagram illustrates the authentication architecture and flows in the Lang Memo application, based on the PRD and authentication specification.

```mermaid
graph TB
    subgraph "Client-Side (Browser)"
        User[User]
        ReactComponent[React Components]
        AuthProvider[AuthProvider<br/>src/components/providers/AuthProvider.tsx]
        SupabaseClient[Supabase Client<br/>Client-side SDK]
        LocalStorage[(localStorage<br/>Session Storage)]
        APIClient[API Client<br/>src/lib/api/cards.ts]
    end

    subgraph "Server-Side (Astro)"
        Middleware[Middleware<br/>src/middleware/index.ts]
        AstroPage[Astro Pages<br/>Protected Routes]
        APIEndpoint[API Endpoints<br/>/api/cards/*]
        AuthLib[Auth Library<br/>src/lib/auth.ts<br/>getAuthenticatedUser]
        SupabaseServer[Supabase Client<br/>Server-side]
    end

    subgraph "External Services"
        SupabaseAuth[Supabase Auth<br/>Email/Password<br/>Email Verification]
    end

    %% User interactions
    User -->|1. Sign Up/Sign In| ReactComponent
    User -->|2. Access Protected Page| AstroPage
    User -->|3. Make API Call| ReactComponent

    %% Client-side auth flow
    ReactComponent -->|useAuth hook| AuthProvider
    AuthProvider -->|Manages State| SupabaseClient
    AuthProvider -->|Stores Session| LocalStorage
    SupabaseClient <-->|Auth Operations| SupabaseAuth
    
    %% Sign Up Flow
    AuthProvider -->|signUp email, password| SupabaseAuth
    SupabaseAuth -->|Sends Verification Email| User
    User -->|Clicks Verification Link| SupabaseAuth
    SupabaseAuth -->|Verifies Email| AuthProvider
    AuthProvider -->|Updates State| ReactComponent

    %% Sign In Flow
    AuthProvider -->|signIn email, password| SupabaseAuth
    SupabaseAuth -->|Returns Session| AuthProvider
    AuthProvider -->|Stores Token| LocalStorage
    AuthProvider -->|Updates isAuthenticated| ReactComponent

    %% API Call Flow
    ReactComponent -->|getToken| AuthProvider
    AuthProvider -->|Bearer token| APIClient
    APIClient -->|POST /api/cards/generate<br/>Authorization: Bearer token| APIEndpoint

    %% Server-side authentication
    APIEndpoint -->|Extract Token| AuthLib
    AuthLib -->|Validate Token| SupabaseServer
    SupabaseServer -->|getUser| SupabaseAuth
    SupabaseAuth -->|Returns User| SupabaseServer
    SupabaseServer -->|User Valid| AuthLib
    AuthLib -->|Returns user.id| APIEndpoint
    APIEndpoint -->|Process Request| APIEndpoint

    %% Middleware flow
    AstroPage -->|Request| Middleware
    Middleware -->|Check Session| SupabaseServer
    SupabaseServer -->|Session Valid?| Middleware
    Middleware -->|No Session| AstroPage
    AstroPage -->|Redirect to /auth/sign-in| User

    %% Error flows
    AuthLib -->|Invalid Token| APIEndpoint
    APIEndpoint -->|401 Unauthorized| APIClient
    APIClient -->|Handle Error| ReactComponent
    ReactComponent -->|Show Error| User

    %% Session expiration
    SupabaseServer -->|Token Expired| Middleware
    Middleware -->|Redirect| AstroPage
    AstroPage -->|/auth/sign-in?returnUrl=| User

    %% Sign Out Flow
    ReactComponent -->|signOut| AuthProvider
    AuthProvider -->|signOut| SupabaseAuth
    SupabaseAuth -->|Clears Session| AuthProvider
    AuthProvider -->|Clears LocalStorage| LocalStorage
    AuthProvider -->|Updates State| ReactComponent

    style AuthProvider fill:#e1f5ff
    style SupabaseAuth fill:#ffeb3b
    style AuthLib fill:#c8e6c9
    style APIEndpoint fill:#fff9c4
    style Middleware fill:#f3e5f5
```

## Authentication Flows

### 1. Sign Up Flow
```mermaid
sequenceDiagram
    participant User
    participant SignUpForm
    participant AuthProvider
    participant Supabase
    participant Email

    User->>SignUpForm: Enter email & password
    SignUpForm->>AuthProvider: signUp(email, password)
    AuthProvider->>Supabase: auth.signUp()
    Supabase->>Email: Send verification email
    Supabase->>AuthProvider: Success (unverified)
    AuthProvider->>SignUpForm: Redirect to /auth/verify/check
    User->>Email: Click verification link
    Email->>Supabase: Verify token
    Supabase->>AuthProvider: Email verified
    AuthProvider->>SignUpForm: Update state
    SignUpForm->>User: Show success message
```

### 2. Sign In Flow
```mermaid
sequenceDiagram
    participant User
    participant SignInForm
    participant AuthProvider
    participant Supabase
    participant LocalStorage

    User->>SignInForm: Enter credentials
    SignInForm->>AuthProvider: signIn(email, password)
    AuthProvider->>Supabase: auth.signInWithPassword()
    Supabase->>Supabase: Validate credentials
    Supabase->>Supabase: Check email verified
    alt Email Verified
        Supabase->>AuthProvider: Return session (access_token)
        AuthProvider->>LocalStorage: Store session
        AuthProvider->>SignInForm: Update state (isAuthenticated=true)
        SignInForm->>User: Redirect to returnUrl or /
    else Email Not Verified
        Supabase->>AuthProvider: Error: email_not_confirmed
        AuthProvider->>SignInForm: Show error + resend option
    end
```

### 3. API Request Flow (Authenticated)
```mermaid
sequenceDiagram
    participant Component
    participant AuthProvider
    participant APIClient
    participant APIEndpoint
    participant AuthLib
    participant Supabase

    Component->>AuthProvider: useAuth().getToken()
    AuthProvider->>AuthProvider: Get session.access_token
    AuthProvider->>Component: Return "Bearer <token>"
    Component->>APIClient: generateProposals(command, token)
    APIClient->>APIEndpoint: POST /api/cards/generate<br/>Authorization: Bearer <token>
    APIEndpoint->>AuthLib: getAuthenticatedUser(context)
    AuthLib->>AuthLib: Extract token from header
    AuthLib->>Supabase: auth.getUser() with token
    Supabase->>Supabase: Validate JWT token
    alt Token Valid
        Supabase->>AuthLib: Return user object
        AuthLib->>APIEndpoint: Return { user }
        APIEndpoint->>APIEndpoint: Process request (userId = user.id)
        APIEndpoint->>APIClient: 200 OK + Response
        APIClient->>Component: Return data
    else Token Invalid/Expired
        Supabase->>AuthLib: Error
        AuthLib->>APIEndpoint: Throw AuthenticationError
        APIEndpoint->>APIClient: 401 Unauthorized
        APIClient->>Component: Throw ApiError
        Component->>Component: Handle error, redirect to sign-in
    end
```

### 4. Protected Page Access Flow
```mermaid
sequenceDiagram
    participant User
    participant Browser
    participant Middleware
    participant Supabase
    participant AstroPage

    User->>Browser: Navigate to /
    Browser->>Middleware: Request / (protected route)
    Middleware->>Supabase: getSession() from cookies
    alt Session Exists & Valid
        Supabase->>Middleware: Return session
        Middleware->>Middleware: Set context.locals.isAuthenticated = true
        Middleware->>AstroPage: Continue to page
        AstroPage->>Browser: Render page
        Browser->>User: Show content
    else No Session or Invalid
        Supabase->>Middleware: No session
        Middleware->>Middleware: Extract current URL as returnUrl
        Middleware->>Browser: Redirect to /auth/sign-in?returnUrl=/
        Browser->>User: Show sign-in page
    end
```

### 5. Session Expiration Flow
```mermaid
sequenceDiagram
    participant Component
    participant AuthProvider
    participant Supabase
    participant APIClient
    participant APIEndpoint

    Note over Component,APIEndpoint: User is using app, session expires
    
    Component->>APIClient: Make API call with expired token
    APIClient->>APIEndpoint: Request with expired token
    APIEndpoint->>Supabase: Validate token
    Supabase->>APIEndpoint: Token expired/invalid
    APIEndpoint->>APIClient: 401 Unauthorized
    APIClient->>Component: ApiError (401)
    
    alt Client-Side Detection
        Supabase->>AuthProvider: onAuthStateChange(SIGNED_OUT)
        AuthProvider->>AuthProvider: Clear session state
        AuthProvider->>Component: Update isAuthenticated = false
        Component->>Component: Redirect to /auth/sign-in?returnUrl=<current>
    end
```

## Component Architecture

### Authentication Components Hierarchy
```mermaid
graph TD
    App[App Root]
    AuthProvider[AuthProvider<br/>Manages auth state]
    PendingProposalsProvider[PendingProposalsProvider<br/>Manages pending proposals]
    GenerateReviewView[GenerateReviewView<br/>Main app view]
    
    App --> AuthProvider
    AuthProvider --> PendingProposalsProvider
    PendingProposalsProvider --> GenerateReviewView
    
    GenerateReviewView --> GenerateReviewContainer[GenerateReviewContainer<br/>Uses useAuth hook]
    GenerateReviewView --> GenerateButton[GenerateButton]
    GenerateReviewView --> ProposalList[ProposalList]
    
    GenerateReviewContainer -->|getToken| AuthProvider
    GenerateReviewContainer -->|API calls| APIClient[API Client]
```

## Key Files and Responsibilities

| File | Responsibility |
|------|---------------|
| `src/components/providers/AuthProvider.tsx` | Client-side auth state management, Supabase client operations |
| `src/lib/auth.ts` | Server-side token validation (`getAuthenticatedUser`) |
| `src/middleware/index.ts` | Sets up Supabase client, handles protected routes (future) |
| `src/lib/api/cards.ts` | API client that includes auth tokens in requests |
| `src/pages/api/cards/*.ts` | Protected API endpoints that validate tokens |

## Security Considerations

1. **Token Storage**: Access tokens stored in localStorage (client) and HTTP-only cookies (server)
2. **Token Validation**: All API endpoints validate tokens server-side via `getAuthenticatedUser`
3. **Email Verification**: Required before sign-in (enforced by Supabase)
4. **Session Refresh**: Automatic token refresh handled by Supabase client
5. **Development Mode**: `DISABLE_AUTH` flag bypasses authentication for development

## Authentication States

```mermaid
stateDiagram-v2
    [*] --> Unauthenticated: Initial Load
    Unauthenticated --> SigningUp: User clicks Sign Up
    SigningUp --> EmailVerificationPending: Sign up success
    EmailVerificationPending --> EmailVerified: User clicks link
    EmailVerified --> SigningIn: User clicks Sign In
    Unauthenticated --> SigningIn: User clicks Sign In
    SigningIn --> Authenticated: Credentials valid + email verified
    Authenticated --> Unauthenticated: Sign out or session expired
    SigningIn --> Unauthenticated: Invalid credentials or unverified email
```
