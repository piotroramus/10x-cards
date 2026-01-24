import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { CharacterCounter } from "./CharacterCounter";
import { cn } from "@/lib/utils";
import type { PendingProposalViewModel, CardProposal } from "@/types";

interface CardProposalEditorProps {
  proposal: PendingProposalViewModel;
  onUpdate: (id: string, proposal: CardProposal) => void;
  onAccept: (id: string, proposal: CardProposal) => void;
  onReject: (id: string) => void;
  accepting?: boolean;
}

/**
 * CardProposalEditor component for individual proposal with inline editing
 * Displays editable front/back text fields with real-time validation
 */
export function CardProposalEditor({
  proposal,
  onUpdate,
  onAccept,
  onReject,
  accepting = false,
}: CardProposalEditorProps) {
  const [front, setFront] = useState(proposal.front);
  const [back, setBack] = useState(proposal.back);

  const FRONT_MAX = 200;
  const BACK_MAX = 500;

  const frontValid = front.length > 0 && front.length <= FRONT_MAX;
  const backValid = back.length > 0 && back.length <= BACK_MAX;
  const isValid = frontValid && backValid;

  const handleFrontChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFront = e.target.value;
    if (newFront.length <= FRONT_MAX) {
      setFront(newFront);
      onUpdate(proposal.id, { front: newFront, back });
    }
  };

  const handleBackChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newBack = e.target.value;
    if (newBack.length <= BACK_MAX) {
      setBack(newBack);
      onUpdate(proposal.id, { front, back: newBack });
    }
  };

  const handleAccept = () => {
    if (isValid) {
      onAccept(proposal.id, { front, back });
    }
  };

  const handleReject = () => {
    onReject(proposal.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && isValid) {
      e.preventDefault();
      handleAccept();
    }
  };

  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <section
      className="space-y-4 rounded-md border-l-[3px] border-l-primary border-y border-r bg-card p-5 shadow-sm transition-all duration-200 hover:shadow-md"
      onKeyDown={handleKeyDown}
      role="group"
    >
      <div className="space-y-2">
        <label htmlFor={`proposal-front-${proposal.id}`} className="text-sm font-semibold text-primary">
          Front
        </label>
        <input
          id={`proposal-front-${proposal.id}`}
          type="text"
          value={front}
          onChange={handleFrontChange}
          maxLength={FRONT_MAX}
          className={cn(
            "w-full rounded-md border bg-background px-3 py-2 text-sm",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            !frontValid && "border-destructive focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40"
          )}
          aria-invalid={!frontValid}
          aria-describedby={`proposal-front-error-${proposal.id}`}
        />
        <div className="flex items-center justify-between">
          <CharacterCounter
            current={front.length}
            max={FRONT_MAX}
            label="Front text character count"
            showError={front.length > FRONT_MAX}
          />
          {(front.length === 0 || front.length > FRONT_MAX) && (
            <p id={`proposal-front-error-${proposal.id}`} className="text-xs text-destructive ml-2" role="alert">
              {front.length === 0 ? "Front is required" : `Front must be ${FRONT_MAX} characters or less`}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor={`proposal-back-${proposal.id}`} className="text-sm font-semibold text-primary">
          Back
        </label>
        <textarea
          id={`proposal-back-${proposal.id}`}
          value={back}
          onChange={handleBackChange}
          maxLength={BACK_MAX}
          rows={4}
          className={cn(
            "w-full rounded-md border bg-background px-3 py-2 text-sm",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "resize-y",
            !backValid && "border-destructive focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40"
          )}
          aria-invalid={!backValid}
          aria-describedby={`proposal-back-error-${proposal.id}`}
        />
        <div className="flex items-center justify-between">
          <CharacterCounter
            current={back.length}
            max={BACK_MAX}
            label="Back text character count"
            showError={back.length > BACK_MAX}
          />
          {(back.length === 0 || back.length > BACK_MAX) && (
            <p id={`proposal-back-error-${proposal.id}`} className="text-xs text-destructive ml-2" role="alert">
              {back.length === 0 ? "Back is required" : `Back must be ${BACK_MAX} characters or less`}
            </p>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={handleAccept} disabled={!isValid || accepting} className="flex-1" variant="default">
          {accepting ? "Saving..." : "Accept"}
        </Button>
        <Button onClick={handleReject} disabled={accepting} variant="outline" className="flex-1">
          Reject
        </Button>
      </div>
    </section>
  );
}
