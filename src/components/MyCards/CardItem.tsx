import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { CardEditor } from "./CardEditor";
import { DeleteConfirmationDialog } from "./DeleteConfirmationDialog";
import type { CardDTO } from "@/types";

interface CardItemProps {
  card: CardDTO;
  onDelete: (cardId: string) => Promise<void>;
  onUpdate: (cardId: string, front: string, back: string) => Promise<void>;
}

/**
 * CardItem component displays a single card with edit/delete actions
 */
export function CardItem({ card, onDelete, onUpdate }: CardItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleEdit = () => {
    setIsEditing(true);
    setIsExpanded(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSaveEdit = async (front: string, back: string) => {
    await onUpdate(card.id, front, back);
    setIsEditing(false);
  };

  const handleDelete = async () => {
    await onDelete(card.id);
    setShowDeleteDialog(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  };

  if (isEditing) {
    return (
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <CardEditor front={card.front} back={card.back} onSave={handleSaveEdit} onCancel={handleCancelEdit} />
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="mb-3">
              <div className="mb-1 flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">FRONT</span>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    card.origin === "ai" ? "bg-primary/10 text-primary" : "bg-secondary/50 text-secondary-foreground"
                  }`}
                >
                  {card.origin === "ai" ? "AI" : "Manual"}
                </span>
              </div>
              <p className="text-base font-medium">{card.front}</p>
            </div>

            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex w-full items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="size-3" />
                  Hide answer
                </>
              ) : (
                <>
                  <ChevronDown className="size-3" />
                  Show answer
                </>
              )}
            </button>

            {isExpanded && (
              <div className="mt-3 rounded-md bg-muted/50 p-4">
                <div className="mb-1 text-xs font-medium text-muted-foreground">BACK</div>
                <p className="text-sm">{card.back}</p>
              </div>
            )}

            <div className="mt-3 text-xs text-muted-foreground">
              Created {formatDate(card.created_at)}
              {card.updated_at !== card.created_at && <> · Updated {formatDate(card.updated_at)}</>}
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleEdit} aria-label="Edit card">
              <Pencil className="size-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowDeleteDialog(true)} aria-label="Delete card">
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      <DeleteConfirmationDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
      />
    </>
  );
}
