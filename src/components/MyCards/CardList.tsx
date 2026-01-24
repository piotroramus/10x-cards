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
export function CardList({ cards, onDelete, onUpdate, currentPage, totalPages, onPageChange }: CardListProps) {
  return (
    <div>
      <div className="space-y-4">
        {cards.map((card, index) => (
          <div
            key={card.id}
            className="animate-in fade-in slide-in-from-bottom-4 duration-300"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <CardItem card={card} onDelete={onDelete} onUpdate={onUpdate} />
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="mt-8">
          <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} />
        </div>
      )}
    </div>
  );
}
