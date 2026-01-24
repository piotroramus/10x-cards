import { describe, it, expect } from "vitest";
import { generateProposalsSchema } from "./ai-generation";

describe("AI Generation Validation Schemas", () => {
  describe("generateProposalsSchema", () => {
    // UT-002: AI Generation Input Validation
    describe("text input validation", () => {
      it("should accept valid text input", () => {
        const validInput = {
          text: "Photosynthesis is the process by which plants convert light energy into chemical energy.",
        };

        const result = generateProposalsSchema.safeParse(validInput);
        expect(result.success).toBe(true);
      });

      it("should accept text with exactly 10,000 characters", () => {
        const input = {
          text: "a".repeat(10000),
        };

        const result = generateProposalsSchema.safeParse(input);
        expect(result.success).toBe(true);
      });

      it("should reject text exceeding 10,000 characters", () => {
        const input = {
          text: "a".repeat(10001),
        };

        const result = generateProposalsSchema.safeParse(input);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toBe("Text must be 10,000 characters or less");
        }
      });

      it("should accept text with less than 10,000 characters", () => {
        const input = {
          text: "a".repeat(9999),
        };

        const result = generateProposalsSchema.safeParse(input);
        expect(result.success).toBe(true);
      });

      it("should reject empty text", () => {
        const input = {
          text: "",
        };

        const result = generateProposalsSchema.safeParse(input);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toBe("Text cannot be empty");
        }
      });

      it("should reject missing text field", () => {
        const input = {};

        const result = generateProposalsSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it("should accept typical text input (500-1000 characters)", () => {
        const input = {
          text: "Photosynthesis is a crucial biological process that allows plants, algae, and some bacteria to convert light energy, usually from the sun, into chemical energy stored in glucose molecules. This process takes place primarily in the chloroplasts of plant cells, where chlorophyll pigments capture light energy. The overall equation for photosynthesis can be summarized as: 6CO2 + 6H2O + light energy → C6H12O6 + 6O2. This means that carbon dioxide and water, in the presence of light, are converted into glucose and oxygen.",
        };

        const result = generateProposalsSchema.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.text.length).toBeGreaterThan(100);
          expect(result.data.text.length).toBeLessThan(10000);
        }
      });

      it("should accept short text input (minimum valid length)", () => {
        const input = {
          text: "A",
        };

        const result = generateProposalsSchema.safeParse(input);
        expect(result.success).toBe(true);
      });
    });

    describe("edge cases", () => {
      it("should handle text with special characters", () => {
        const input = {
          text: 'Test with special chars: !@#$%^&*()_+-=[]{}|;:",.<>?/~`',
        };

        const result = generateProposalsSchema.safeParse(input);
        expect(result.success).toBe(true);
      });

      it("should handle text with unicode characters", () => {
        const input = {
          text: "こんにちは世界 🌍 Émojis and ñoñó",
        };

        const result = generateProposalsSchema.safeParse(input);
        expect(result.success).toBe(true);
      });

      it("should handle text with multiple newlines", () => {
        const input = {
          text: "Line 1\n\nLine 2\n\n\nLine 3",
        };

        const result = generateProposalsSchema.safeParse(input);
        expect(result.success).toBe(true);
      });

      it("should reject non-string text", () => {
        const input = {
          text: 123,
        };

        const result = generateProposalsSchema.safeParse(input);
        expect(result.success).toBe(false);
      });
    });
  });
});
