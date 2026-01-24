import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { CharacterCounter } from "@/components/GenerateReview/CharacterCounter";

interface CardEditorProps {
  front: string;
  back: string;
  onSave: (front: string, back: string) => Promise<void>;
  onCancel: () => void;
}

/**
 * CardEditor component provides inline editing for card fields
 */
export function CardEditor({ front, back, onSave, onCancel }: CardEditorProps) {
  const [frontValue, setFrontValue] = useState(front);
  const [backValue, setBackValue] = useState(back);
  const [isSaving, setIsSaving] = useState(false);

  const FRONT_LIMIT = 200;
  const BACK_LIMIT = 500;

  const isFrontValid = frontValue.trim().length > 0 && frontValue.length <= FRONT_LIMIT;
  const isBackValid = backValue.trim().length > 0 && backValue.length <= BACK_LIMIT;
  const isValid = isFrontValid && isBackValid;

  const handleSave = async () => {
    if (!isValid) return;

    setIsSaving(true);
    try {
      await onSave(frontValue.trim(), backValue.trim());
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="edit-front" className="mb-2 block text-sm font-medium">
          Front
        </label>
        <textarea
          id="edit-front"
          value={frontValue}
          onChange={(e) => setFrontValue(e.target.value)}
          className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="Enter the front of the card"
          disabled={isSaving}
        />
        <CharacterCounter current={frontValue.length} limit={FRONT_LIMIT} />
        {!isFrontValid && frontValue.trim().length === 0 && (
          <p className="mt-1 text-xs text-destructive">Front cannot be empty</p>
        )}
      </div>

      <div>
        <label htmlFor="edit-back" className="mb-2 block text-sm font-medium">
          Back
        </label>
        <textarea
          id="edit-back"
          value={backValue}
          onChange={(e) => setBackValue(e.target.value)}
          className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="Enter the back of the card"
          disabled={isSaving}
        />
        <CharacterCounter current={backValue.length} limit={BACK_LIMIT} />
        {!isBackValid && backValue.trim().length === 0 && (
          <p className="mt-1 text-xs text-destructive">Back cannot be empty</p>
        )}
      </div>

      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={!isValid || isSaving}>
          {isSaving ? "Saving..." : "Save"}
        </Button>
        <Button variant="outline" onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
