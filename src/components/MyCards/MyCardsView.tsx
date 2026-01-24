import React, { useEffect, useState, useCallback } from "react";
import { AppHeader } from "@/components/AppHeader";
import { AuthProvider, useAuth } from "@/components/providers";
import { ToastContainer } from "@/components/Toast";
import { CardList } from "./CardList";
import { EmptyState } from "./EmptyState";
import { toast } from "@/lib/utils/toast";
import type { CardDTO, ListCardsResponse } from "@/types";

/**
 * MyCardsContent component displays the user's saved cards
 * Handles fetching, pagination, editing, and deletion of cards
 */
function MyCardsContent() {
  const { session } = useAuth();
  const [cards, setCards] = useState<CardDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const limit = 50;

  // Fetch cards from API
  const fetchCards = useCallback(
    async (page: number) => {
      if (!session) return;

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/cards?page=${page}&limit=${limit}`, {
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch cards");
        }

        const data: ListCardsResponse = await response.json();
        setCards(data.data);
        setTotalPages(data.pagination.total_pages);
        setTotal(data.pagination.total);
        setCurrentPage(page);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to load cards";
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [session, limit]
  );

  // Initial fetch
  useEffect(() => {
    fetchCards(1);
  }, [session, fetchCards]);

  // Handle card deletion
  const handleDelete = async (cardId: string) => {
    // Optimistic update
    const previousCards = [...cards];
    setCards(cards.filter((card) => card.id !== cardId));
    setTotal((prev) => prev - 1);

    try {
      const response = await fetch(`/api/cards/${cardId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete card");
      }

      toast.success("Card deleted successfully");
    } catch (err) {
      // Rollback on error
      setCards(previousCards);
      setTotal((prev) => prev + 1);
      const errorMessage = err instanceof Error ? err.message : "Failed to delete card";
      toast.error(errorMessage);
    }
  };

  // Handle card update
  const handleUpdate = async (cardId: string, front: string, back: string) => {
    // Optimistic update
    const previousCards = [...cards];
    setCards(
      cards.map((card) => (card.id === cardId ? { ...card, front, back, updated_at: new Date().toISOString() } : card))
    );

    try {
      const response = await fetch(`/api/cards/${cardId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ front, back }),
      });

      if (!response.ok) {
        throw new Error("Failed to update card");
      }

      const updatedCard: CardDTO = await response.json();
      setCards(cards.map((card) => (card.id === cardId ? updatedCard : card)));
      toast.success("Card updated successfully");
    } catch (err) {
      // Rollback on error
      setCards(previousCards);
      const errorMessage = err instanceof Error ? err.message : "Failed to update card";
      toast.error(errorMessage);
    }
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    fetchCards(page);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />

      <main className="container mx-auto flex-1 px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">My Cards</h1>
            {total > 0 && (
              <p className="mt-2 text-base text-muted-foreground">
                {total} {total === 1 ? "card" : "cards"} total
              </p>
            )}
          </div>
          <a
            href="/"
            className="text-sm font-medium text-primary transition-colors hover:text-primary/80 hover:underline"
          >
            ← Back to Generate
          </a>
        </div>

        {error && (
          <div className="mb-6 rounded-md border border-destructive bg-destructive/10 p-4">
            <p className="text-sm text-destructive">{error}</p>
            <button onClick={() => fetchCards(currentPage)} className="mt-2 text-sm text-primary hover:underline">
              Try again
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-lg border bg-muted" />
            ))}
          </div>
        ) : cards.length === 0 ? (
          <EmptyState />
        ) : (
          <CardList
            cards={cards}
            onDelete={handleDelete}
            onUpdate={handleUpdate}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        )}
      </main>
    </div>
  );
}

/**
 * MyCardsView - Client-side wrapper that provides all context providers
 */
export function MyCardsView() {
  return (
    <AuthProvider>
      <MyCardsContent />
      <ToastContainer />
    </AuthProvider>
  );
}
