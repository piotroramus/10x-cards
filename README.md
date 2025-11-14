# 10x Cards (Lang Memo)

A web application that reduces the friction of creating effective study flashcards by using AI to generate high-quality card proposals from pasted English text. Users can edit, accept, or reject proposals, create cards manually, and practice them with a simple session flow.

## Table of Contents

- [Project Description](#project-description)
- [Tech Stack](#tech-stack)
- [Getting Started Locally](#getting-started-locally)
- [Available Scripts](#available-scripts)
- [Project Scope](#project-scope)
- [Project Status](#project-status)
- [License](#license)

## Project Description

Lang Memo (10x Cards) is designed to solve the problem of time-consuming manual flashcard creation that interrupts study flow. The application uses AI to transform pasted English text into concise, valid flashcard proposals, allowing users to quickly review, edit, and accept only what they want to keep.

### Key Features

- **AI-Powered Generation**: Generate up to 5 flashcard proposals from pasted text (max 10,000 characters)
- **Inline Editing**: Review and edit proposals before accepting, with real-time validation
- **Manual Creation**: Create flashcards manually with the same validation rules
- **Simple Practice Mode**: Practice all saved cards with shuffle functionality and correct/incorrect tracking
- **Authentication Required**: Secure access with email/password authentication and email verification
- **Privacy-Focused**: Raw source text is never stored on the server or in analytics

### User Flow

1. **Paste** → Paste English text into the textarea
2. **Generate** → AI creates flashcard proposals
3. **Review/Edit** → Edit proposals inline with character counters and validation
4. **Accept/Reject** → Accept valid proposals or reject unwanted ones
5. **Practice** → Start a practice session with shuffled cards`

## Tech Stack

### Frontend

- **[Astro](https://astro.build/)** v5 - Modern web framework for building fast, content-focused websites
- **[React](https://react.dev/)** v19 - UI library for building interactive components
- **[TypeScript](https://www.typescriptlang.org/)** v5 - Static typing for better IDE support and code quality
- **[Tailwind CSS](https://tailwindcss.com/)** v4 - Utility-first CSS framework
- **[Shadcn/ui](https://ui.shadcn.com/)** - High-quality React component library

### Backend

- **[Supabase](https://supabase.com/)** - Backend-as-a-Service providing:
  - PostgreSQL database with Row Level Security (RLS) for multi-tenant data isolation
  - Authentication (email/password with email verification)
  - Edge Functions for server-side logic (AI generation, validation, analytics)
  - Real-time capabilities (if needed in future)

### AI Integration

- **[OpenRouter.ai](https://openrouter.ai/)** - API gateway for AI models:
  - Access to multiple model providers (OpenAI, Anthropic, Google, etc.)
  - Budget controls and API key management with spending limits
  - Server-side integration via Supabase Edge Functions

### CI/CD and Hosting

- **GitHub Actions** - CI/CD pipelines
- **DigitalOcean** - Application hosting via Docker container

## Getting Started Locally

### Prerequisites

- **Node.js** v22.14.0 (as specified in `.nvmrc`)
- **npm** (comes with Node.js)

### Installation

1. Clone the repository:

```bash
git clone https://github.com/piotroramus/10x-cards.git
cd 10x-cards
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

Create a `.env` file in the root directory with the necessary environment variables (Supabase URL, keys, OpenRouter API key, etc.). Refer to the project documentation for required variables.

4. Run the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:4321` (or the port specified by Astro).

5. Build for production:

```bash
npm run build
```

## Available Scripts

- `npm run dev` - Start the Astro development server
- `npm run build` - Build the application for production
- `npm run preview` - Preview the production build locally
- `npm run lint` - Run ESLint to check for code issues
- `npm run lint:fix` - Automatically fix ESLint issues
- `npm run format` - Format code with Prettier

## Project Scope

### In Scope (MVP)

- ✅ AI-based proposal generation from pasted English text
- ✅ Manual card creation with validation rules
- ✅ Edit/Accept/Reject flows with persistence only on Accept/Save
- ✅ Single default collection (duplicates allowed)
- ✅ Simple practice mode with shuffle and correct/incorrect marking
- ✅ Authentication required to access the app (email/password with email verification via Supabase)
- ✅ Minimal analytics to support KPI measurement
- ✅ Client-side validation with character limits (front ≤ 200, back ≤ 500)
- ✅ Server-side schema validation and error handling
- ✅ Privacy-focused design (no raw source text storage)

### Out of Scope (MVP)

- ❌ Advanced spaced-repetition algorithms or scheduling (e.g., SM-2)
- ❌ Decks/collections management beyond a single default collection
- ❌ Import formats (PDF, DOCX, etc.) and external integrations
- ❌ Sharing sets with other users
- ❌ Mobile apps (web-only for MVP)
- ❌ Accept All action
- ❌ Export of cards and account deletion flows

### Key Constraints

- Strict schema and character limits enforced both client-side and server-side
- No raw source text stored on the server or in analytics
- Budget model usage via OpenRouter with daily org/user caps to control spend
- English-only UI and content for generation and validation
- Maximum input length: 10,000 characters per request
- Maximum proposals per request: 5 cards
- Generation latency target: typically within 10 seconds for average inputs

## Project Status

This project is currently in **MVP (Minimum Viable Product)** development phase. The focus is on:

- Speed to value
- Minimal UX
- Measurable quality
- Deferring advanced features (spaced-repetition scheduling, deck management, etc.)

### Success Metrics

- **Acceptance Rate**: Target of at least 75% of AI-generated proposals accepted
- **AI Creation Share**: Target of at least 75% of all created cards originated from AI

### Analytics

The application tracks the following events:
- `generate` - AI proposal generation
- `accept` - Proposal acceptance
- `reject` - Proposal rejection
- `manual_create` - Manual card creation
- `practice_done` - Practice session completion

All events include timestamp, userId, origin (ai|manual where applicable), and minimal context. Raw source text is excluded from analytics. Event retention: 90 days.

## License

MIT

You are an AI assistant whose task is to help plan a PostgreSQL database schema for an MVP (Minimum Viable Product) based on the provided information. Your goal is to generate a list of questions and recommendations that will be used in subsequent prompting to create the database schema, relationships, and row-level security (RLS) policies.

Please carefully review the following information:

<product_requirements>
@prd.md
</product_requirements>

<tech_stack>
@tech-stack.md
</tech_stack>

Analyze the provided information, focusing on aspects relevant to database design. Consider the following issues:

1. Identify key entities and their attributes based on product requirements.
2. Determine potential relationships between entities.
3. Consider data types and constraints that may be necessary.
4. Think about scalability and performance impact.
5. Assess security requirements and their impact on database design.
6. Consider any specific PostgreSQL features that might be beneficial for the project.

Based on your analysis, generate a list of 10 questions and recommendations in a combined form (question + recommendation). These should address any ambiguities, potential issues, or areas where more information is needed to create an effective database schema. Consider questions regarding:

1. Entity relationships and cardinality
2. Data types and constraints
3. Indexing strategies
4. Partitioning (if applicable)
5. Row-level security requirements
6. Performance considerations
7. Scalability concerns
8. Data integrity and consistency

The output should have the following structure:

<questions>
List your questions and recommendations here, numbered for clarity:

For example:
1. Should the `users` entity have a relationship with `posts`?

Recommendation: Yes, the `users` entity should have a relationship with `posts` because users can create posts.
</questions>

Remember that your goal is to provide a comprehensive list of questions and recommendations that will help create a solid PostgreSQL database schema for the MVP. Focus on clarity, relevance, and accuracy of your outputs. Do not include any additional comments or explanations beyond the specified output format.

Continue this process, generating new questions and recommendations based on the provided context and user responses, until the user explicitly requests a summary.

Remember to focus on clarity, relevance, and accuracy of outputs. Do not include any additional comments or explanations beyond the specified output format.