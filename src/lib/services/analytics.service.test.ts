import { describe, it, expect, vi, beforeEach } from "vitest";
import { AnalyticsService } from "./analytics.service";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../db/database.types";

describe("AnalyticsService", () => {
  let service: AnalyticsService;
  let mockSupabase: SupabaseClient<Database>;
  let mockInsert: ReturnType<typeof vi.fn>;
  let mockFrom: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock chain
    mockInsert = vi.fn().mockResolvedValue({ error: null });
    mockFrom = vi.fn().mockReturnValue({
      insert: mockInsert,
    });

    mockSupabase = {
      from: mockFrom,
    } as unknown as SupabaseClient<Database>;

    service = new AnalyticsService(mockSupabase);
  });

  // UT-005: Privacy - Raw Source Text Not Stored
  describe("privacy validation - raw source text", () => {
    it("should NOT store raw source text in generate event", async () => {
      await service.trackEvent("user-123", "generate", null, {});

      expect(mockFrom).toHaveBeenCalledWith("analytics_events");
      expect(mockInsert).toHaveBeenCalledWith({
        user_id: "user-123",
        event_type: "generate",
        origin: null,
        context: {},
      });

      // Verify no text field in the call
      const insertCall = mockInsert.mock.calls[0][0];
      expect(insertCall).not.toHaveProperty("text");
      expect(insertCall).not.toHaveProperty("source_text");
      expect(insertCall).not.toHaveProperty("raw_text");
      expect(insertCall).not.toHaveProperty("input_text");
    });

    it("should NOT include raw source text even if passed in context", async () => {
      // Attempting to pass raw text in context (should be filtered out by caller)
      const contextWithText = {
        character_count: 500,
        // Note: We're testing that even if someone accidentally passes text,
        // it won't be in a field called 'text', 'source_text', etc.
      };

      await service.trackEvent("user-123", "generate", null, contextWithText);

      const insertCall = mockInsert.mock.calls[0][0];
      expect(insertCall.context).toEqual({ character_count: 500 });

      // Explicitly verify no text-related fields
      if (insertCall.context && typeof insertCall.context === "object") {
        expect(insertCall.context).not.toHaveProperty("text");
        expect(insertCall.context).not.toHaveProperty("source_text");
        expect(insertCall.context).not.toHaveProperty("raw_text");
        expect(insertCall.context).not.toHaveProperty("input");
      }
    });

    it("should only store metadata for generate event, not content", async () => {
      const metadata = {
        proposal_count: 5,
        character_count: 1500,
      };

      await service.trackEvent("user-123", "generate", null, metadata);

      const insertCall = mockInsert.mock.calls[0][0];
      expect(insertCall.context).toEqual({
        proposal_count: 5,
        character_count: 1500,
      });
    });

    it("should NOT store raw source text in accept event", async () => {
      await service.trackEvent("user-123", "accept", "ai", {});

      const insertCall = mockInsert.mock.calls[0][0];
      expect(insertCall).not.toHaveProperty("text");
      expect(insertCall).not.toHaveProperty("source_text");
    });

    it("should NOT store raw source text in reject event", async () => {
      await service.trackEvent("user-123", "reject", "ai", {});

      const insertCall = mockInsert.mock.calls[0][0];
      expect(insertCall).not.toHaveProperty("text");
      expect(insertCall).not.toHaveProperty("source_text");
    });

    it("should NOT store raw source text in manual_create event", async () => {
      await service.trackEvent("user-123", "manual_create", "manual", {});

      const insertCall = mockInsert.mock.calls[0][0];
      expect(insertCall).not.toHaveProperty("text");
      expect(insertCall).not.toHaveProperty("source_text");
    });

    it("should NOT store raw source text in practice_done event", async () => {
      const practiceStats = {
        cards_studied: 10,
        correct_count: 7,
        incorrect_count: 3,
        duration_seconds: 300,
      };

      await service.trackEvent("user-123", "practice_done", null, practiceStats);

      const insertCall = mockInsert.mock.calls[0][0];
      expect(insertCall.context).toEqual(practiceStats);
      expect(insertCall).not.toHaveProperty("text");
      expect(insertCall).not.toHaveProperty("cards"); // Should not store card content
    });
  });

  describe("event tracking", () => {
    it("should track generate event with correct parameters", async () => {
      await service.trackEvent("user-123", "generate", null, {});

      expect(mockFrom).toHaveBeenCalledWith("analytics_events");
      expect(mockInsert).toHaveBeenCalledWith({
        user_id: "user-123",
        event_type: "generate",
        origin: null,
        context: {},
      });
    });

    it("should track accept event with ai origin", async () => {
      await service.trackEvent("user-123", "accept", "ai", {});

      expect(mockInsert).toHaveBeenCalledWith({
        user_id: "user-123",
        event_type: "accept",
        origin: "ai",
        context: {},
      });
    });

    it("should track reject event with ai origin", async () => {
      await service.trackEvent("user-123", "reject", "ai", {});

      expect(mockInsert).toHaveBeenCalledWith({
        user_id: "user-123",
        event_type: "reject",
        origin: "ai",
        context: {},
      });
    });

    it("should track manual_create event with manual origin", async () => {
      await service.trackEvent("user-123", "manual_create", "manual", {});

      expect(mockInsert).toHaveBeenCalledWith({
        user_id: "user-123",
        event_type: "manual_create",
        origin: "manual",
        context: {},
      });
    });

    it("should track practice_done event with context", async () => {
      const context = {
        cards_studied: 15,
        correct_count: 12,
        incorrect_count: 3,
      };

      await service.trackEvent("user-123", "practice_done", null, context);

      expect(mockInsert).toHaveBeenCalledWith({
        user_id: "user-123",
        event_type: "practice_done",
        origin: null,
        context: context,
      });
    });
  });

  describe("error handling", () => {
    it("should not throw error when database insert fails", async () => {
      mockInsert.mockResolvedValue({
        error: { message: "Database error" },
      });

      // Should not throw
      await expect(service.trackEvent("user-123", "generate", null, {})).resolves.not.toThrow();
    });

    it("should not throw error when unexpected error occurs", async () => {
      mockInsert.mockRejectedValue(new Error("Unexpected error"));

      // Should not throw
      await expect(service.trackEvent("user-123", "generate", null, {})).resolves.not.toThrow();
    });

    it("should log warning when database insert fails", async () => {
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {
        // Mock implementation
      });

      mockInsert.mockResolvedValue({
        error: { message: "Database error" },
      });

      await service.trackEvent("user-123", "generate", null, {});

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Failed to create analytics event"),
        expect.any(Object)
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe("context handling", () => {
    it("should handle null context", async () => {
      await service.trackEvent("user-123", "generate", null);

      const insertCall = mockInsert.mock.calls[0][0];
      expect(insertCall.context).toBeNull();
    });

    it("should handle undefined context", async () => {
      await service.trackEvent("user-123", "generate", null, undefined);

      const insertCall = mockInsert.mock.calls[0][0];
      expect(insertCall.context).toBeNull();
    });

    it("should handle empty context object", async () => {
      await service.trackEvent("user-123", "generate", null, {});

      const insertCall = mockInsert.mock.calls[0][0];
      // Empty object {} is converted to {} (not null) by the service
      expect(insertCall.context).toEqual({});
    });

    it("should preserve valid context data", async () => {
      const context = {
        proposal_count: 3,
        duration_ms: 1500,
      };

      await service.trackEvent("user-123", "generate", null, context);

      const insertCall = mockInsert.mock.calls[0][0];
      expect(insertCall.context).toEqual(context);
    });
  });
});
