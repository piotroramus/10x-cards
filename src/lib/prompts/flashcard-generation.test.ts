import { describe, it, expect } from "vitest";
import { FLASHCARD_SYSTEM_PROMPT, createFlashcardUserPrompt } from "./flashcard-generation";

describe("Flashcard Generation Prompts", () => {
  describe("FLASHCARD_SYSTEM_PROMPT", () => {
    it("should contain character limit instructions", () => {
      expect(FLASHCARD_SYSTEM_PROMPT).toContain("200 characters or less");
      expect(FLASHCARD_SYSTEM_PROMPT).toContain("500 characters or less");
    });

    it("should specify maximum flashcard count", () => {
      expect(FLASHCARD_SYSTEM_PROMPT).toContain("up to 5 flashcards");
    });

    it("should instruct to return JSON format", () => {
      expect(FLASHCARD_SYSTEM_PROMPT).toContain("JSON");
      expect(FLASHCARD_SYSTEM_PROMPT).toContain("flashcards");
      expect(FLASHCARD_SYSTEM_PROMPT).toContain("front");
      expect(FLASHCARD_SYSTEM_PROMPT).toContain("back");
    });

    it("should emphasize quality and independence of flashcards", () => {
      expect(FLASHCARD_SYSTEM_PROMPT).toContain("independent");
      expect(FLASHCARD_SYSTEM_PROMPT).toContain("concise");
      expect(FLASHCARD_SYSTEM_PROMPT).toContain("clear");
    });

    it("should be a non-empty string", () => {
      expect(FLASHCARD_SYSTEM_PROMPT).toBeTruthy();
      expect(typeof FLASHCARD_SYSTEM_PROMPT).toBe("string");
      expect(FLASHCARD_SYSTEM_PROMPT.length).toBeGreaterThan(0);
    });
  });

  describe("createFlashcardUserPrompt", () => {
    it("should create prompt with provided text", () => {
      const text = "Photosynthesis is the process plants use to convert sunlight into energy.";
      const prompt = createFlashcardUserPrompt(text);

      expect(prompt).toContain(text);
      expect(prompt).toContain("Generate flashcards");
    });

    it("should handle short text", () => {
      const text = "Water is H2O.";
      const prompt = createFlashcardUserPrompt(text);

      expect(prompt).toContain(text);
    });

    it("should handle long text", () => {
      const text = "a".repeat(5000);
      const prompt = createFlashcardUserPrompt(text);

      expect(prompt).toContain(text);
      expect(prompt.length).toBeGreaterThan(5000);
    });

    it("should handle text with special characters", () => {
      const text = "E=mc² is Einstein's famous equation. It shows mass-energy equivalence.";
      const prompt = createFlashcardUserPrompt(text);

      expect(prompt).toContain(text);
      expect(prompt).toContain("²");
      expect(prompt).toContain("'");
    });

    it("should handle text with newlines", () => {
      const text = "Line 1\nLine 2\nLine 3";
      const prompt = createFlashcardUserPrompt(text);

      expect(prompt).toContain(text);
      expect(prompt).toContain("\n");
    });

    it("should handle empty text", () => {
      const text = "";
      const prompt = createFlashcardUserPrompt(text);

      expect(prompt).toContain("Generate flashcards");
      expect(typeof prompt).toBe("string");
    });

    it("should have consistent format", () => {
      const text1 = "Text 1";
      const text2 = "Text 2";

      const prompt1 = createFlashcardUserPrompt(text1);
      const prompt2 = createFlashcardUserPrompt(text2);

      // Both should start with the same instruction
      const instruction = "Generate flashcards from the following text:";
      expect(prompt1.startsWith(instruction)).toBe(true);
      expect(prompt2.startsWith(instruction)).toBe(true);
    });

    it("should separate instruction from text", () => {
      const text = "Some educational content";
      const prompt = createFlashcardUserPrompt(text);

      // Should have instruction, separator (newlines), and text
      expect(prompt).toContain("\n\n");
    });
  });
});
