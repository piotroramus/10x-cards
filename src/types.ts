import type { Tables } from "./db/database.types";

// ============================================================================
// Entity Types (derived from database)
// ============================================================================

/**
 * Card entity from database (cards table Row type)
 * Excludes deleted_at and user_id from public-facing DTOs
 */
type CardEntity = Tables<"cards">;

/**
 * Analytics event entity from database (analytics_events table Row type)
 * Excludes user_id from public-facing DTOs
 */
type AnalyticsEventEntity = Tables<"analytics_events">;

// ============================================================================
// Enums and Literal Types
// ============================================================================

/**
 * Card origin type - indicates how the card was created
 */
export type CardOrigin = "ai" | "manual";

/**
 * Analytics event type - indicates the type of user action
 */
export type EventType = "generate" | "accept" | "reject" | "manual_create" | "practice_done";

/**
 * Analytics origin type - indicates the origin context for analytics events
 */
export type AnalyticsOrigin = "ai" | "manual" | null;

// ============================================================================
// Card DTOs and Commands
// ============================================================================

/**
 * Card DTO - Public representation of a card (excludes user_id and deleted_at)
 * Used in: ListCardsResponse, GetCardResponse, CreateCardResponse, AcceptProposalResponse, UpdateCardResponse, PracticeCardsResponse
 */
export type CardDTO = Pick<CardEntity, "id" | "front" | "back" | "origin" | "created_at" | "updated_at">;

/**
 * Command to create a card manually
 * POST /api/cards
 * Derived from CardEntity Insert type, but only front and back are user-provided
 */
export type CreateCardCommand = Pick<CardEntity, "front" | "back">;

/**
 * Response after creating a card manually
 * POST /api/cards
 */
export type CreateCardResponse = CardDTO;

/**
 * Command to accept an AI-generated proposal
 * POST /api/cards/accept
 * Same structure as CreateCardCommand, but semantically different (accepts AI proposal)
 */
export type AcceptProposalCommand = Pick<CardEntity, "front" | "back">;

/**
 * Response after accepting a proposal
 * POST /api/cards/accept
 * Note: origin will always be 'ai' for accepted proposals
 */
export type AcceptProposalResponse = CardDTO;

/**
 * Command to update a card
 * PATCH /api/cards/:id
 * Derived from CardEntity Update type, but only front and back are user-updatable
 */
export type UpdateCardCommand = Partial<Pick<CardEntity, "front" | "back">>;

/**
 * Response after updating a card
 * PATCH /api/cards/:id
 */
export type UpdateCardResponse = CardDTO;

/**
 * Response after deleting a card
 * DELETE /api/cards/:id
 */
export interface DeleteCardResponse {
  message: string;
}

/**
 * Pagination metadata
 * Used in ListCardsResponse
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

/**
 * Response for listing cards with pagination
 * GET /api/cards
 */
export interface ListCardsResponse {
  data: CardDTO[];
  pagination: PaginationMeta;
}

/**
 * Response for getting a single card
 * GET /api/cards/:id
 */
export type GetCardResponse = CardDTO;

/**
 * Response for getting cards for practice
 * GET /api/cards/practice
 */
export interface PracticeCardsResponse {
  data: CardDTO[];
  count: number;
}

// ============================================================================
// AI Generation DTOs and Commands
// ============================================================================

/**
 * Card proposal structure (not persisted, only returned from AI generation)
 * Used in GenerateProposalsResponse
 */
export interface CardProposal {
  front: string;
  back: string;
}

/**
 * Command to generate card proposals from text
 * POST /api/cards/generate
 */
export interface GenerateProposalsCommand {
  text: string;
}

/**
 * Response containing AI-generated card proposals
 * POST /api/cards/generate
 */
export interface GenerateProposalsResponse {
  proposals: CardProposal[];
  count: number;
}

// ============================================================================
// Analytics DTOs and Commands
// ============================================================================

/**
 * Context structure for practice_done events
 * Used in PracticeDoneCommand and PracticeDoneResponse
 */
export interface PracticeDoneContext {
  card_count: number;
  correct_count: number;
}

/**
 * Context structure for accept and manual_create events (optional card_id)
 * Used in TrackEventCommand
 */
export interface CardEventContext {
  card_id?: string;
}

/**
 * Union type for all possible analytics event contexts
 * Used in TrackEventCommand
 */
export type AnalyticsEventContext =
  | Record<string, never> // Empty object for generate, reject
  | CardEventContext // For accept, manual_create
  | PracticeDoneContext; // For practice_done

/**
 * Command to track an analytics event
 * POST /api/analytics/events
 * Derived from AnalyticsEventEntity Insert type, but excludes user_id (set from JWT)
 */
export interface TrackEventCommand {
  event_type: EventType;
  origin: AnalyticsOrigin;
  context?: AnalyticsEventContext;
}

/**
 * Response after tracking an analytics event
 * POST /api/analytics/events
 * Derived from AnalyticsEventEntity Row type, but excludes user_id
 */
export type TrackEventResponse = Pick<AnalyticsEventEntity, "id" | "event_type" | "origin" | "context" | "created_at">;

/**
 * Command to track practice session completion
 * POST /api/analytics/practice-done
 * Convenience endpoint that creates a practice_done event
 */
export type PracticeDoneCommand = PracticeDoneContext;

/**
 * Response after tracking practice session completion
 * POST /api/analytics/practice-done
 * Note: event_type will always be 'practice_done' and origin will always be null
 */
export interface PracticeDoneResponse {
  id: string;
  event_type: "practice_done";
  origin: null;
  context: PracticeDoneContext;
  created_at: string;
}

// ============================================================================
// Error Response
// ============================================================================

/**
 * Error code types for API error responses
 */
export type ErrorCode = "VALIDATION_ERROR" | "AUTHENTICATION_ERROR" | "NOT_FOUND" | "QUOTA_EXCEEDED" | "SERVER_ERROR";

/**
 * Standard error response format
 * Used across all error responses
 */
export interface ErrorResponse {
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown>;
  };
}

// ============================================================================
// View Model Types (for frontend state management)
// ============================================================================

/**
 * Pending proposal view model - extends CardProposal with temporary ID
 * Used for tracking pending proposals before acceptance
 */
export interface PendingProposalViewModel extends CardProposal {
  id: string; // Temporary client-side UUID for React keys
}

/**
 * Error banner state - represents error state for ErrorBanner component
 */
export interface ErrorBannerState {
  type: "QUOTA_EXCEEDED" | "NETWORK_ERROR" | "INVALID_JSON" | "SERVER_ERROR" | "VALIDATION_ERROR";
  message: string;
  retryable: boolean;
  retryCount?: number; // Optional: track retry attempts
}

/**
 * Generation state - manages AI generation loading and error state
 */
export interface GenerationState {
  isLoading: boolean;
  error: ErrorBannerState | null;
  retryCount: number; // Track retry attempts (max 2)
}
