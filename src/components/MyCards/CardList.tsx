import React from "react";
import { CardItem } from "./CardItem";
import { PaginationControls } from "./PaginationControls";
import type { CardDTO } from "@/types";

interface CardListProps {
  cards: CardDTO[];
  onDelete: (cardId: string) => Promise<void>;
  onUpdate: (cardId: string, front: string, back: string) => Promise<void>;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

/**
 * CardList component displays a paginated list of cards
 */
export function CardList({
  cards,
  onDelete,
  onUpdate,
  currentPage,
  totalPages,
  onPageChange,
}: CardListProps) {
  return (
    <div>
      <div className="space-y-4">
        {cards.map((card) => (
          <CardItem
            key={card.id}
            card={card}
            onDelete={onDelete}
            onUpdate={onUpdate}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="mt-8">
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
          />
        </div>
      )}
    </div>
  );
}
