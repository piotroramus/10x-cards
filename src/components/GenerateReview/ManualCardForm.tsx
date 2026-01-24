import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { CharacterCounter } from "./CharacterCounter";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CreateCardCommand } from "@/types";

interface ManualCardFormProps {
  onCreate: (command: CreateCardCommand) => void;
  saving?: boolean;
  collapsed?: boolean;
}

/**
 * ManualCardForm component for manual card creation
 * Includes front/back input fields, character counters, and Save button
 */
export function ManualCardForm({ onCreate, saving = false, collapsed: initialCollapsed = false }: ManualCardFormProps) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");

  const FRONT_MAX = 200;
  const BACK_MAX = 500;

  const frontValid = front.length > 0 && front.length <= FRONT_MAX;
  const backValid = back.length > 0 && back.length <= BACK_MAX;
  const isValid = frontValid && backValid;

  const handleFrontChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFront = e.target.value;
    if (newFront.length <= FRONT_MAX) {
      setFront(newFront);
    }
  };

  const handleBackChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newBack = e.target.value;
    if (newBack.length <= BACK_MAX) {
      setBack(newBack);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValid) {
      onCreate({ front, back });
      setFront("");
      setBack("");
    }
  };

  const handleToggle = () => {
    setCollapsed(!collapsed);
  };

  return (
    <div className="rounded-md border bg-card">
      <button
        type="button"
        onClick={handleToggle}
        className="flex w-full items-center justify-between p-4 text-left"
        aria-expanded={!collapsed}
        aria-controls="manual-card-form-content"
      >
        <h3 className="text-sm font-semibold">Create Card Manually</h3>
        {collapsed ? (
          <ChevronDown className="size-4" aria-hidden="true" />
        ) : (
          <ChevronUp className="size-4" aria-hidden="true" />
        )}
      </button>
      {!collapsed && (
        <form id="manual-card-form-content" onSubmit={handleSubmit} className="space-y-4 p-4 pt-0">
          <div className="space-y-2">
            <label htmlFor="manual-front" className="text-sm font-medium">
              Front
            </label>
            <input
              id="manual-front"
              type="text"
              value={front}
              onChange={handleFrontChange}
              maxLength={FRONT_MAX}
              className={cn(
                "w-full rounded-md border bg-background px-3 py-2 text-sm",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                !frontValid &&
                  "border-destructive focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40"
              )}
              aria-invalid={!frontValid}
              aria-describedby="manual-front-error"
            />
            <div className="flex items-center justify-between">
              <CharacterCounter
                current={front.length}
                max={FRONT_MAX}
                label="Front text character count"
                showError={front.length > FRONT_MAX}
              />
              {(front.length === 0 || front.length > FRONT_MAX) && (
                <p id="manual-front-error" className="text-xs text-destructive ml-2" role="alert">
                  {front.length === 0 ? "Front is required" : `Front must be ${FRONT_MAX} characters or less`}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="manual-back" className="text-sm font-medium">
              Back
            </label>
            <textarea
              id="manual-back"
              value={back}
              onChange={handleBackChange}
              maxLength={BACK_MAX}
              rows={4}
              className={cn(
                "w-full rounded-md border bg-background px-3 py-2 text-sm",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "resize-y",
                !backValid &&
                  "border-destructive focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40"
              )}
              aria-invalid={!backValid}
              aria-describedby="manual-back-error"
            />
            <div className="flex items-center justify-between">
              <CharacterCounter
                current={back.length}
                max={BACK_MAX}
                label="Back text character count"
                showError={back.length > BACK_MAX}
              />
              {(back.length === 0 || back.length > BACK_MAX) && (
                <p id="manual-back-error" className="text-xs text-destructive ml-2" role="alert">
                  {back.length === 0 ? "Back is required" : `Back must be ${BACK_MAX} characters or less`}
                </p>
              )}
            </div>
          </div>

          <Button type="submit" disabled={!isValid || saving} className="w-full">
            {saving ? "Saving..." : "Save Card"}
          </Button>
        </form>
      )}
    </div>
  );
}
