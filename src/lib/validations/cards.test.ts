import { describe, it, expect } from 'vitest';
import {
  createCardSchema,
  updateCardSchema,
  cardIdSchema,
} from './cards';

describe('Card Validation Schemas', () => {
  describe('createCardSchema', () => {
    it('should validate a valid card creation request', () => {
      const validCard = {
        front: 'What is TypeScript?',
        back: 'A typed superset of JavaScript',
      };

      const result = createCardSchema.safeParse(validCard);
      expect(result.success).toBe(true);
    });

    it('should reject empty front content', () => {
      const invalidCard = {
        front: '',
        back: 'Answer',
      };

      const result = createCardSchema.safeParse(invalidCard);
      expect(result.success).toBe(false);
    });

    it('should reject empty back content', () => {
      const invalidCard = {
        front: 'Question',
        back: '',
      };

      const result = createCardSchema.safeParse(invalidCard);
      expect(result.success).toBe(false);
    });

    it('should trim whitespace from front and back', () => {
      const cardWithWhitespace = {
        front: '  Question  ',
        back: '  Answer  ',
      };

      const result = createCardSchema.safeParse(cardWithWhitespace);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.front).toBe('Question');
        expect(result.data.back).toBe('Answer');
      }
    });
  });

  describe('updateCardSchema', () => {
    it('should validate a valid card update request', () => {
      const validUpdate = {
        front: 'Updated question?',
        back: 'Updated answer',
      };

      const result = updateCardSchema.safeParse(validUpdate);
      expect(result.success).toBe(true);
    });

    it('should allow partial updates', () => {
      const partialUpdate = {
        front: 'Updated question?',
      };

      const result = updateCardSchema.safeParse(partialUpdate);
      expect(result.success).toBe(true);
    });
  });

  describe('cardIdSchema', () => {
    it('should validate a valid UUID', () => {
      const validId = '123e4567-e89b-12d3-a456-426614174000';
      
      const result = cardIdSchema.safeParse(validId);
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID format', () => {
      const invalidId = 'not-a-uuid';
      
      const result = cardIdSchema.safeParse(invalidId);
      expect(result.success).toBe(false);
    });

    it('should reject empty string', () => {
      const result = cardIdSchema.safeParse('');
      expect(result.success).toBe(false);
    });
  });
});
