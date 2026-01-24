import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json } from "../../db/database.types.ts";
import type { AnalyticsEventContext, AnalyticsOrigin, EventType } from "../../types.ts";

/**
 * Service for analytics-related database operations
 */
export class AnalyticsService {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Tracks an analytics event
   *
   * This method is designed to be non-blocking. If the event creation fails,
   * it logs the error but does not throw, allowing the calling code to continue.
   *
   * @param userId - The authenticated user's ID
   * @param eventType - Type of event to track
   * @param origin - Origin of the event ('ai', 'manual', or null)
   * @param context - Optional context data for the event
   * @returns Promise that resolves when the event is created (or fails silently)
   */
  async trackEvent(
    userId: string,
    eventType: EventType,
    origin: AnalyticsOrigin,
    context?: AnalyticsEventContext
  ): Promise<void> {
    try {
      const { error } = await this.supabase.from("analytics_events").insert({
        user_id: userId,
        event_type: eventType,
        origin: origin,
        context: (context as Json) || null,
      });

      if (error) {
        // Log error but don't throw - analytics should not block main operations
        console.warn(`Failed to create analytics event: ${eventType}`, {
          error: error.message,
          userId,
        });
      }
    } catch (error) {
      // Log unexpected errors but don't throw
      console.warn(`Unexpected error creating analytics event: ${eventType}`, {
        error: error instanceof Error ? error.message : String(error),
        userId,
      });
    }
  }
}
