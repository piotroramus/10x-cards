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
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Front cannot be empty');
      }
    });

    it('should reject empty back content', () => {
      const invalidCard = {
        front: 'Question',
        back: '',
      };

      const result = createCardSchema.safeParse(invalidCard);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Back cannot be empty');
      }
    });

    // UT-001: Character Limits Validation
    describe('character limits', () => {
      it('should accept front text with exactly 200 characters', () => {
        const card = {
          front: 'a'.repeat(200),
          back: 'Answer',
        };

        const result = createCardSchema.safeParse(card);
        expect(result.success).toBe(true);
      });

      it('should reject front text exceeding 200 characters', () => {
        const card = {
          front: 'a'.repeat(201),
          back: 'Answer',
        };

        const result = createCardSchema.safeParse(card);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toBe('Front must be 200 characters or less');
        }
      });

      it('should accept front text with less than 200 characters', () => {
        const card = {
          front: 'a'.repeat(199),
          back: 'Answer',
        };

        const result = createCardSchema.safeParse(card);
        expect(result.success).toBe(true);
      });

      it('should accept back text with exactly 500 characters', () => {
        const card = {
          front: 'Question',
          back: 'a'.repeat(500),
        };

        const result = createCardSchema.safeParse(card);
        expect(result.success).toBe(true);
      });

      it('should reject back text exceeding 500 characters', () => {
        const card = {
          front: 'Question',
          back: 'a'.repeat(501),
        };

        const result = createCardSchema.safeParse(card);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toBe('Back must be 500 characters or less');
        }
      });

      it('should accept back text with less than 500 characters', () => {
        const card = {
          front: 'Question',
          back: 'a'.repeat(499),
        };

        const result = createCardSchema.safeParse(card);
        expect(result.success).toBe(true);
      });

      it('should reject both fields when both exceed limits', () => {
        const card = {
          front: 'a'.repeat(201),
          back: 'b'.repeat(501),
        };

        const result = createCardSchema.safeParse(card);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors.length).toBe(2);
        }
      });
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

    it('should allow partial updates (front only)', () => {
      const partialUpdate = {
        front: 'Updated question?',
      };

      const result = updateCardSchema.safeParse(partialUpdate);
      expect(result.success).toBe(true);
    });

    it('should allow partial updates (back only)', () => {
      const partialUpdate = {
        back: 'Updated answer',
      };

      const result = updateCardSchema.safeParse(partialUpdate);
      expect(result.success).toBe(true);
    });

    it('should reject update with no fields', () => {
      const emptyUpdate = {};

      const result = updateCardSchema.safeParse(emptyUpdate);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('At least one field (front or back) must be provided');
      }
    });

    // UT-001: Character Limits for Updates
    describe('character limits', () => {
      it('should reject front text exceeding 200 characters', () => {
        const update = {
          front: 'a'.repeat(201),
        };

        const result = updateCardSchema.safeParse(update);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toBe('Front must be 200 characters or less');
        }
      });

      it('should reject back text exceeding 500 characters', () => {
        const update = {
          back: 'a'.repeat(501),
        };

        const result = updateCardSchema.safeParse(update);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toBe('Back must be 500 characters or less');
        }
      });

      it('should accept valid character limits', () => {
        const update = {
          front: 'a'.repeat(200),
          back: 'b'.repeat(500),
        };

        const result = updateCardSchema.safeParse(update);
        expect(result.success).toBe(true);
      });
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
