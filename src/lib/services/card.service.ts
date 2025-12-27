import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../../db/database.types.ts";
import type { CardDTO, CreateCardCommand } from "../../types.ts";
import type { ListCardsQueryParams } from "../validations/cards.ts";
import { AnalyticsService } from "./analytics.service.ts";

/**
 * Options for listing cards
 */
export interface ListCardsOptions {
  page: number;
  limit: number;
  includeDeleted: boolean;
}

/**
 * Result of listing cards
 */
export interface ListCardsResult {
  data: CardDTO[];
  total: number;
}

/**
 * Service for card-related database operations
 */
export class CardService {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Lists cards for a user with pagination
   * 
   * @param userId - The authenticated user's ID
   * @param options - Pagination and filtering options
   * @returns Promise resolving to cards data and total count
   * @throws Error if database query fails
   */
  async listCards(
    userId: string,
    options: ListCardsOptions,
  ): Promise<ListCardsResult> {
    const { page, limit, includeDeleted } = options;

    // Build the base query
    let query = this.supabase
      .from("cards")
      .select("id, front, back, origin, created_at, updated_at", { count: "exact" })
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    // Conditionally filter out soft-deleted cards
    if (!includeDeleted) {
      query = query.is("deleted_at", null);
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    
    let data, count, error;
    try {
      const result = await query.range(from, to);
      data = result.data;
      count = result.count;
      error = result.error;
    } catch (fetchError) {
      // Handle network/connection errors
      const errorMessage = fetchError instanceof Error ? fetchError.message : String(fetchError);
      throw new Error(
        `Failed to connect to database: ${errorMessage}. ` +
        `Please ensure Supabase is running and SUPABASE_URL is correct.`
      );
    }

    if (error) {
      throw new Error(`Failed to fetch cards: ${error.message}`);
    }

    // Transform database rows to DTOs (already selecting only needed fields)
    const cards: CardDTO[] = (data || []).map((card) => ({
      id: card.id,
      front: card.front,
      back: card.back,
      origin: card.origin as "ai" | "manual",
      created_at: card.created_at,
      updated_at: card.updated_at,
    }));

    return {
      data: cards,
      total: count || 0,
    };
  }

  /**
   * Creates a new card for a user
   * 
   * @param command - The card creation command (front and back)
   * @param userId - The authenticated user's ID
   * @returns Promise resolving to the created card DTO
   * @throws Error if database insert fails
   */
  async createCard(command: CreateCardCommand, userId: string): Promise<CardDTO> {
    // Insert card into database
    let data, error;
    try {
      const result = await this.supabase
        .from("cards")
        .insert({
          user_id: userId,
          front: command.front,
          back: command.back,
          origin: "manual",
        })
        .select("id, front, back, origin, created_at, updated_at")
        .single();
      data = result.data;
      error = result.error;
    } catch (fetchError) {
      // Handle network/connection errors
      const errorMessage = fetchError instanceof Error ? fetchError.message : String(fetchError);
      throw new Error(
        `Failed to connect to database: ${errorMessage}. ` +
        `Please ensure Supabase is running and SUPABASE_URL is correct.`
      );
    }

    if (error) {
      throw new Error(`Failed to create card: ${error.message}`);
    }

    if (!data) {
      throw new Error("Card creation succeeded but no data returned");
    }

    // Transform database row to DTO
    const card: CardDTO = {
      id: data.id,
      front: data.front,
      back: data.back,
      origin: data.origin as "ai" | "manual",
      created_at: data.created_at,
      updated_at: data.updated_at,
    };

    // Create analytics event (non-blocking)
    const analyticsService = new AnalyticsService(this.supabase);
    await analyticsService.trackEvent(userId, "manual_create", "manual", {
      card_id: card.id,
    });

    return card;
  }
}

