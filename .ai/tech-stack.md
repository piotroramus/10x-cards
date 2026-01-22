# Tech Stack - Lang Memo

## Frontend

- **Astro 5** - Fast, efficient framework for building pages and applications with minimal JavaScript
- **React 19** - UI library for interactive components where needed
- **TypeScript 5** - Static typing for better IDE support and code quality
- **Tailwind 4** - Utility-first CSS framework for styling
- **Shadcn/ui** - React component library for building the UI

## Backend

- **Supabase** - Backend-as-a-Service solution providing:
  - PostgreSQL database with Row Level Security (RLS) for multi-tenant data isolation
  - Authentication (email/password with email verification)
  - Edge Functions for server-side logic (AI generation, validation, analytics)
  - Real-time capabilities (if needed in future)
  - Open source, can be self-hosted or used as managed service

## AI Integration

- **OpenRouter.ai** - API gateway for AI models:
  - Access to multiple model providers (OpenAI, Anthropic, Google, etc.)
  - Budget controls and API key management with spending limits
  - Server-side integration via Supabase Edge Functions

## Testing

- **Vitest** - Fast, modern unit testing framework:
  - Unit tests for validation schemas, utilities, and business logic
  - Integration tests for API endpoints, database operations, and auth flows
  - Built on Vite for fast execution and hot module replacement
  - Native TypeScript support
- **Playwright** - End-to-end testing framework:
  - Complete user flow testing from UI to database
  - Cross-browser testing (Chromium, Firefox, WebKit)
  - Built-in test runner with parallelization
  - Screenshot and video recording on failures
- **React Testing Library** - Component testing utilities:
  - Test React components in isolation
  - User-centric testing approach
  - Integrates seamlessly with Vitest

## CI/CD and Hosting

- **GitHub Actions** - CI/CD pipelines:
  - Automated testing (unit, integration, E2E)
  - Code quality checks (ESLint, Prettier, TypeScript)
  - Build verification
  - Deployment automation
- **DigitalOcean** - Application hosting via Docker container
