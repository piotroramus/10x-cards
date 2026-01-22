import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CardService } from './card.service';
import { NotFoundError } from '../errors/api-errors';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../db/database.types';

// Mock analytics service
const mockTrackEvent = vi.fn().mockResolvedValue(undefined);
vi.mock('./analytics.service', () => ({
  AnalyticsService: class MockAnalyticsService {
    trackEvent = mockTrackEvent;
  },
}));

describe('CardService', () => {
  let service: CardService;
  let mockSupabase: SupabaseClient<Database>;
  let mockSelect: ReturnType<typeof vi.fn>;
  let mockInsert: ReturnType<typeof vi.fn>;
  let mockUpdate: ReturnType<typeof vi.fn>;
  let mockEq: ReturnType<typeof vi.fn>;
  let mockIs: ReturnType<typeof vi.fn>;
  let mockOrder: ReturnType<typeof vi.fn>;
  let mockRange: ReturnType<typeof vi.fn>;
  let mockSingle: ReturnType<typeof vi.fn>;
  let mockFrom: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock functions
    mockSingle = vi.fn();
    mockRange = vi.fn();
    mockOrder = vi.fn();
    mockIs = vi.fn();
    mockEq = vi.fn();
    mockUpdate = vi.fn();
    mockInsert = vi.fn();
    mockSelect = vi.fn();

    // Set up default return values
    mockRange.mockResolvedValue({
      data: [],
      count: 0,
      error: null,
    });
    mockSingle.mockResolvedValue({
      data: null,
      error: null,
    });

    // Set up the chain with all methods returning objects with all needed methods
    const createChainedMock = () => ({
      eq: mockEq,
      order: mockOrder,
      is: mockIs,
      select: mockSelect,
      single: mockSingle,
      range: mockRange,
    });

    mockSelect.mockReturnValue(createChainedMock());
    mockEq.mockReturnValue(createChainedMock());
    mockOrder.mockReturnValue(createChainedMock());
    mockIs.mockReturnValue(createChainedMock());
    mockInsert.mockReturnValue(createChainedMock());
    mockUpdate.mockReturnValue(createChainedMock());

    mockFrom = vi.fn().mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
    });

    mockSupabase = {
      from: mockFrom,
    } as unknown as SupabaseClient<Database>;

    service = new CardService(mockSupabase);
  });

  describe('listCards', () => {
    it('should list cards with pagination', async () => {
      const mockCards = [
        {
          id: 'card-1',
          front: 'Question 1',
          back: 'Answer 1',
          origin: 'manual',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'card-2',
          front: 'Question 2',
          back: 'Answer 2',
          origin: 'ai',
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
        },
      ];

      mockRange.mockResolvedValue({
        data: mockCards,
        count: 10,
        error: null,
      });

      const result = await service.listCards('user-123', {
        page: 1,
        limit: 50,
        includeDeleted: false,
      });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(10);
      expect(result.data[0].id).toBe('card-1');
      expect(mockFrom).toHaveBeenCalledWith('cards');
      expect(mockEq).toHaveBeenCalledWith('user_id', 'user-123');
      expect(mockIs).toHaveBeenCalledWith('deleted_at', null);
    });

    it('should calculate correct pagination range', async () => {
      mockRange.mockResolvedValue({
        data: [],
        count: 0,
        error: null,
      });

      await service.listCards('user-123', {
        page: 2,
        limit: 25,
        includeDeleted: false,
      });

      // Page 2 with limit 25: from = (2-1) * 25 = 25, to = 25 + 25 - 1 = 49
      expect(mockRange).toHaveBeenCalledWith(25, 49);
    });

    it('should include deleted cards when includeDeleted is true', async () => {
      mockOrder.mockReturnValue({
        range: mockRange,
      });

      mockRange.mockResolvedValue({
        data: [],
        count: 0,
        error: null,
      });

      await service.listCards('user-123', {
        page: 1,
        limit: 50,
        includeDeleted: true,
      });

      // Should not call .is() when includeDeleted is true
      expect(mockIs).not.toHaveBeenCalled();
    });

    it('should filter out deleted cards when includeDeleted is false', async () => {
      mockRange.mockResolvedValue({
        data: [],
        count: 0,
        error: null,
      });

      await service.listCards('user-123', {
        page: 1,
        limit: 50,
        includeDeleted: false,
      });

      expect(mockIs).toHaveBeenCalledWith('deleted_at', null);
    });

    it('should handle database errors', async () => {
      mockRange.mockResolvedValue({
        data: null,
        count: null,
        error: { message: 'Database connection failed' },
      });

      await expect(
        service.listCards('user-123', {
          page: 1,
          limit: 50,
          includeDeleted: false,
        })
      ).rejects.toThrow('Failed to fetch cards');
    });

    it('should handle network errors with helpful message', async () => {
      mockRange.mockRejectedValue(new Error('Network error'));

      await expect(
        service.listCards('user-123', {
          page: 1,
          limit: 50,
          includeDeleted: false,
        })
      ).rejects.toThrow(/Failed to connect to database.*Supabase/);
    });
  });

  describe('createCard', () => {
    it('should create card with manual origin', async () => {
      const mockCard = {
        id: 'card-1',
        front: 'Question',
        back: 'Answer',
        origin: 'manual',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockSingle.mockResolvedValue({
        data: mockCard,
        error: null,
      });

      const result = await service.createCard(
        { front: 'Question', back: 'Answer' },
        'user-123'
      );

      expect(result.id).toBe('card-1');
      expect(result.origin).toBe('manual');
      expect(mockFrom).toHaveBeenCalledWith('cards');
      expect(mockInsert).toHaveBeenCalledWith({
        user_id: 'user-123',
        front: 'Question',
        back: 'Answer',
        origin: 'manual',
      });
    });

    it('should track manual_create analytics event', async () => {
      const mockCard = {
        id: 'card-1',
        front: 'Question',
        back: 'Answer',
        origin: 'manual',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockSingle.mockResolvedValue({
        data: mockCard,
        error: null,
      });

      // Clear mock before test
      mockTrackEvent.mockClear();

      await service.createCard(
        { front: 'Question', back: 'Answer' },
        'user-123'
      );

      expect(mockTrackEvent).toHaveBeenCalledWith(
        'user-123',
        'manual_create',
        'manual',
        { card_id: 'card-1' }
      );
    });

    it('should handle database errors', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'Constraint violation' },
      });

      await expect(
        service.createCard({ front: 'Q', back: 'A' }, 'user-123')
      ).rejects.toThrow('Failed to create card');
    });

    it('should handle missing data in response', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: null,
      });

      await expect(
        service.createCard({ front: 'Q', back: 'A' }, 'user-123')
      ).rejects.toThrow('Card creation succeeded but no data returned');
    });
  });

  describe('acceptProposal', () => {
    it('should create card with ai origin', async () => {
      const mockCard = {
        id: 'card-1',
        front: 'Question',
        back: 'Answer',
        origin: 'ai',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockSingle.mockResolvedValue({
        data: mockCard,
        error: null,
      });

      const result = await service.acceptProposal(
        { front: 'Question', back: 'Answer' },
        'user-123'
      );

      expect(result.id).toBe('card-1');
      expect(result.origin).toBe('ai');
      expect(mockInsert).toHaveBeenCalledWith({
        user_id: 'user-123',
        front: 'Question',
        back: 'Answer',
        origin: 'ai',
      });
    });

    it('should track accept analytics event with ai origin', async () => {
      const mockCard = {
        id: 'card-1',
        front: 'Question',
        back: 'Answer',
        origin: 'ai',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockSingle.mockResolvedValue({
        data: mockCard,
        error: null,
      });

      // Clear mock before test
      mockTrackEvent.mockClear();

      await service.acceptProposal(
        { front: 'Question', back: 'Answer' },
        'user-123'
      );

      expect(mockTrackEvent).toHaveBeenCalledWith(
        'user-123',
        'accept',
        'ai',
        { card_id: 'card-1' }
      );
    });

    it('should handle database errors', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      await expect(
        service.acceptProposal({ front: 'Q', back: 'A' }, 'user-123')
      ).rejects.toThrow('Failed to accept proposal');
    });
  });

  describe('updateCard', () => {
    it('should update card with partial data (front only)', async () => {
      const mockCard = {
        id: 'card-1',
        front: 'Updated Question',
        back: 'Original Answer',
        origin: 'manual',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      };

      mockSingle.mockResolvedValue({
        data: mockCard,
        error: null,
      });

      const result = await service.updateCard(
        'card-1',
        { front: 'Updated Question' },
        'user-123'
      );

      expect(result.front).toBe('Updated Question');
      expect(mockUpdate).toHaveBeenCalledWith({ front: 'Updated Question' });
      expect(mockEq).toHaveBeenCalledWith('id', 'card-1');
      expect(mockEq).toHaveBeenCalledWith('user_id', 'user-123');
      expect(mockIs).toHaveBeenCalledWith('deleted_at', null);
    });

    it('should update card with partial data (back only)', async () => {
      const mockCard = {
        id: 'card-1',
        front: 'Original Question',
        back: 'Updated Answer',
        origin: 'manual',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      };

      mockSingle.mockResolvedValue({
        data: mockCard,
        error: null,
      });

      const result = await service.updateCard(
        'card-1',
        { back: 'Updated Answer' },
        'user-123'
      );

      expect(result.back).toBe('Updated Answer');
      expect(mockUpdate).toHaveBeenCalledWith({ back: 'Updated Answer' });
    });

    it('should update both front and back', async () => {
      const mockCard = {
        id: 'card-1',
        front: 'Updated Question',
        back: 'Updated Answer',
        origin: 'ai',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      };

      mockSingle.mockResolvedValue({
        data: mockCard,
        error: null,
      });

      await service.updateCard(
        'card-1',
        { front: 'Updated Question', back: 'Updated Answer' },
        'user-123'
      );

      expect(mockUpdate).toHaveBeenCalledWith({
        front: 'Updated Question',
        back: 'Updated Answer',
      });
    });

    it('should throw NotFoundError when card not found', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      });

      await expect(
        service.updateCard('card-1', { front: 'Updated' }, 'user-123')
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError when card belongs to different user', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: null,
      });

      await expect(
        service.updateCard('card-1', { front: 'Updated' }, 'user-123')
      ).rejects.toThrow(NotFoundError);
    });

    it('should not update soft-deleted cards', async () => {
      // The query includes .is('deleted_at', null)
      mockSingle.mockResolvedValue({
        data: null,
        error: null,
      });

      await expect(
        service.updateCard('card-1', { front: 'Updated' }, 'user-123')
      ).rejects.toThrow(NotFoundError);

      expect(mockIs).toHaveBeenCalledWith('deleted_at', null);
    });
  });

  describe('deleteCard', () => {
    it('should soft delete card by setting deleted_at', async () => {
      mockSingle.mockResolvedValue({
        data: { id: 'card-1' },
        error: null,
      });

      await service.deleteCard('card-1', 'user-123');

      expect(mockUpdate).toHaveBeenCalledWith({
        deleted_at: expect.any(String),
      });
      expect(mockEq).toHaveBeenCalledWith('id', 'card-1');
      expect(mockEq).toHaveBeenCalledWith('user_id', 'user-123');
      expect(mockIs).toHaveBeenCalledWith('deleted_at', null);
    });

    it('should throw NotFoundError when card not found', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      });

      await expect(
        service.deleteCard('card-1', 'user-123')
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError when card belongs to different user', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: null,
      });

      await expect(
        service.deleteCard('card-1', 'user-123')
      ).rejects.toThrow(NotFoundError);
    });

    it('should not delete already deleted cards', async () => {
      // The query includes .is('deleted_at', null)
      mockSingle.mockResolvedValue({
        data: null,
        error: null,
      });

      await expect(
        service.deleteCard('card-1', 'user-123')
      ).rejects.toThrow(NotFoundError);

      expect(mockIs).toHaveBeenCalledWith('deleted_at', null);
    });

    it('should handle database errors', async () => {
      mockSingle.mockResolvedValue({
        data: { id: 'card-1' },
        error: { message: 'Database error' },
      });

      await expect(
        service.deleteCard('card-1', 'user-123')
      ).rejects.toThrow('Failed to delete card');
    });
  });
});
