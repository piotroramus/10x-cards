import { describe, it, expect, vi, beforeEach } from "vitest";
import { AIGenerationService } from "./ai-generation.service";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../db/database.types";

// Mock the OpenRouter service
vi.mock("./openrouter.service", () => ({
  createOpenRouterService: vi.fn(() => ({
    chat: vi.fn(),
  })),
  InvalidJsonError: class InvalidJsonError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "InvalidJsonError";
    }
  },
  PaymentRequiredError: class PaymentRequiredError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "PaymentRequiredError";
    }
  },
  RateLimitError: class RateLimitError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "RateLimitError";
    }
  },
  ServerError: class ServerError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "ServerError";
    }
  },
  NetworkError: class NetworkError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "NetworkError";
    }
  },
}));

// Mock analytics service
const mockTrackEvent = vi.fn().mockResolvedValue(undefined);
vi.mock("./analytics.service", () => ({
  AnalyticsService: class MockAnalyticsService {
    trackEvent = mockTrackEvent;
  },
}));

describe("AIGenerationService", () => {
  let service: AIGenerationService;
  let mockSupabase: SupabaseClient<Database>;
  let mockChat: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Setup mock chat function
    mockChat = vi.fn();

    // Create mock Supabase client
    mockSupabase = {
      from: vi.fn(),
    } as unknown as SupabaseClient<Database>;

    // Create service instance
    service = new AIGenerationService(mockSupabase);

    // Replace the internal openRouter chat method with our mock
    // Using any here is necessary for test mocking private properties
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    (service as unknown as { openRouter: { chat: typeof mockChat } }).openRouter = {
      chat: mockChat,
    };
  });

  // UT-004: AI Response Parsing Tests
  describe("generateProposals - response parsing", () => {
    it("should parse valid JSON with multiple cards", async () => {
      const validResponse = {
        flashcards: [
          { front: "Question 1", back: "Answer 1" },
          { front: "Question 2", back: "Answer 2" },
          { front: "Question 3", back: "Answer 3" },
        ],
      };

      mockChat.mockResolvedValue({
        content: JSON.stringify(validResponse),
      });

      const result = await service.generateProposals("Test text", "user-123");

      expect(result.proposals).toHaveLength(3);
      expect(result.count).toBe(3);
      expect(result.proposals[0]).toEqual({ front: "Question 1", back: "Answer 1" });
    });

    it("should parse valid JSON with single card", async () => {
      const validResponse = {
        flashcards: [{ front: "Question 1", back: "Answer 1" }],
      };

      mockChat.mockResolvedValue({
        content: JSON.stringify(validResponse),
      });

      const result = await service.generateProposals("Test text", "user-123");

      expect(result.proposals).toHaveLength(1);
      expect(result.count).toBe(1);
    });

    it("should handle invalid JSON gracefully with retries", async () => {
      mockChat.mockResolvedValue({
        content: "Not valid JSON at all",
      });

      await expect(service.generateProposals("Test text", "user-123")).rejects.toThrow(/INVALID_JSON/);

      // Should retry 2 times (total 3 attempts)
      expect(mockChat).toHaveBeenCalledTimes(3);
    });

    it("should validate cards within response", async () => {
      const responseWithValidCards = {
        flashcards: [
          { front: "Valid question", back: "Valid answer" },
          { front: "Another valid", back: "Another answer" },
        ],
      };

      mockChat.mockResolvedValue({
        content: JSON.stringify(responseWithValidCards),
      });

      const result = await service.generateProposals("Test text", "user-123");

      expect(result.proposals).toHaveLength(2);
      expect(result.proposals[0].front).toBe("Valid question");
      expect(result.proposals[1].back).toBe("Another answer");
    });

    it("should handle empty flashcards array", async () => {
      const emptyResponse = {
        flashcards: [],
      };

      mockChat.mockResolvedValue({
        content: JSON.stringify(emptyResponse),
      });

      const result = await service.generateProposals("Test text", "user-123");

      expect(result.proposals).toHaveLength(0);
      expect(result.count).toBe(0);
    });

    it("should reject response without flashcards array", async () => {
      const invalidResponse = {
        data: [],
      };

      mockChat.mockResolvedValue({
        content: JSON.stringify(invalidResponse),
      });

      await expect(service.generateProposals("Test text", "user-123")).rejects.toThrow(/INVALID_JSON/);
    });

    it("should reject response with non-array flashcards", async () => {
      const invalidResponse = {
        flashcards: "not an array",
      };

      mockChat.mockResolvedValue({
        content: JSON.stringify(invalidResponse),
      });

      await expect(service.generateProposals("Test text", "user-123")).rejects.toThrow(/INVALID_JSON/);
    });
  });

  describe("character limit filtering", () => {
    it("should filter out proposals with front text exceeding 200 characters", async () => {
      const response = {
        flashcards: [
          { front: "a".repeat(200), back: "Valid answer" }, // Valid
          { front: "a".repeat(201), back: "Valid answer" }, // Invalid - too long
          { front: "Valid question", back: "Valid answer" }, // Valid
        ],
      };

      mockChat.mockResolvedValue({
        content: JSON.stringify(response),
      });

      const result = await service.generateProposals("Test text", "user-123");

      expect(result.proposals).toHaveLength(2);
      expect(result.proposals[0].front).toBe("a".repeat(200));
      expect(result.proposals[1].front).toBe("Valid question");
    });

    it("should filter out proposals with back text exceeding 500 characters", async () => {
      const response = {
        flashcards: [
          { front: "Valid question", back: "a".repeat(500) }, // Valid
          { front: "Valid question", back: "a".repeat(501) }, // Invalid - too long
          { front: "Valid question", back: "Valid answer" }, // Valid
        ],
      };

      mockChat.mockResolvedValue({
        content: JSON.stringify(response),
      });

      const result = await service.generateProposals("Test text", "user-123");

      expect(result.proposals).toHaveLength(2);
      expect(result.proposals[0].back).toBe("a".repeat(500));
      expect(result.proposals[1].back).toBe("Valid answer");
    });

    it("should filter out proposals exceeding both limits", async () => {
      const response = {
        flashcards: [
          { front: "Valid", back: "Valid" }, // Valid
          { front: "a".repeat(201), back: "b".repeat(501) }, // Invalid - both too long
          { front: "Valid", back: "Valid" }, // Valid
        ],
      };

      mockChat.mockResolvedValue({
        content: JSON.stringify(response),
      });

      const result = await service.generateProposals("Test text", "user-123");

      expect(result.proposals).toHaveLength(2);
    });

    it("should retry if all proposals exceed character limits", async () => {
      // First attempt: all invalid
      const firstResponse = {
        flashcards: [
          { front: "a".repeat(201), back: "Valid" },
          { front: "Valid", back: "b".repeat(501) },
        ],
      };

      // Second attempt: valid proposals
      const secondResponse = {
        flashcards: [{ front: "Valid question", back: "Valid answer" }],
      };

      mockChat
        .mockResolvedValueOnce({ content: JSON.stringify(firstResponse) })
        .mockResolvedValueOnce({ content: JSON.stringify(secondResponse) });

      const result = await service.generateProposals("Test text", "user-123");

      expect(result.proposals).toHaveLength(1);
      expect(mockChat).toHaveBeenCalledTimes(2);
    });
  });

  describe("maximum proposals limit", () => {
    it("should limit to 5 proposals maximum", async () => {
      const response = {
        flashcards: [
          { front: "Q1", back: "A1" },
          { front: "Q2", back: "A2" },
          { front: "Q3", back: "A3" },
          { front: "Q4", back: "A4" },
          { front: "Q5", back: "A5" },
          { front: "Q6", back: "A6" },
          { front: "Q7", back: "A7" },
        ],
      };

      mockChat.mockResolvedValue({
        content: JSON.stringify(response),
      });

      const result = await service.generateProposals("Test text", "user-123");

      expect(result.proposals).toHaveLength(5);
      expect(result.count).toBe(5);
    });
  });

  describe("error handling", () => {
    it("should handle PaymentRequiredError", async () => {
      const { PaymentRequiredError } = await import("./openrouter.service");
      const error = new PaymentRequiredError("Quota exceeded");

      mockChat.mockRejectedValue(error);

      await expect(service.generateProposals("Test text", "user-123")).rejects.toThrow(/QUOTA_EXCEEDED/);
    });

    it("should handle RateLimitError", async () => {
      const { RateLimitError } = await import("./openrouter.service");
      const error = new RateLimitError("Rate limit exceeded");

      mockChat.mockRejectedValue(error);

      await expect(service.generateProposals("Test text", "user-123")).rejects.toThrow(/QUOTA_EXCEEDED/);
    });

    it("should handle ServerError", async () => {
      const { ServerError } = await import("./openrouter.service");
      const error = new ServerError("Server error");

      mockChat.mockRejectedValue(error);

      await expect(service.generateProposals("Test text", "user-123")).rejects.toThrow(/SERVER_ERROR/);
    });

    it("should handle NetworkError", async () => {
      const { NetworkError } = await import("./openrouter.service");
      const error = new NetworkError("Network error");

      mockChat.mockRejectedValue(error);

      await expect(service.generateProposals("Test text", "user-123")).rejects.toThrow(/SERVER_ERROR/);
    });
  });

  describe("analytics tracking", () => {
    it("should track generate event on success", async () => {
      const response = {
        flashcards: [{ front: "Question", back: "Answer" }],
      };

      mockChat.mockResolvedValue({
        content: JSON.stringify(response),
      });

      // Clear the mock before test
      mockTrackEvent.mockClear();

      await service.generateProposals("Test text", "user-123");

      // Verify analytics was called (mock is set up at module level)
      expect(mockTrackEvent).toHaveBeenCalledWith("user-123", "generate", null, {});
    });
  });
});
