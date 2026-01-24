import React from "react";
import { CardProposalEditor } from "./CardProposalEditor";
import { EmptyState } from "./EmptyState";
import { LoadingSkeleton } from "./LoadingSkeleton";
import type { PendingProposalViewModel, CardProposal } from "@/types";

interface ProposalListProps {
  proposals: PendingProposalViewModel[];
  onUpdate: (id: string, proposal: CardProposal) => void;
  onAccept: (id: string, proposal: CardProposal) => void;
  onReject: (id: string) => void;
  loading?: boolean;
  acceptingIds?: Set<string>;
}

/**
 * ProposalList component for displaying pending proposals
 * Manages list rendering, empty state, and proposal updates
 */
export function ProposalList({
  proposals,
  onUpdate,
  onAccept,
  onReject,
  loading = false,
  acceptingIds = new Set(),
}: ProposalListProps) {
  if (loading) {
    return <LoadingSkeleton count={3} />;
  }

  if (proposals.length === 0) {
    return (
      <EmptyState
        title="No proposals yet"
        message="Paste your text above and click Generate to create card proposals from AI."
        actionLabel="Scroll to input"
        onAction={() => {
          document.getElementById("text-input")?.scrollIntoView({ behavior: "smooth" });
        }}
      />
    );
  }

  return (
    <div className="space-y-4" role="list" aria-label="Card proposals">
      {proposals.map((proposal) => (
        <div key={proposal.id} role="listitem">
          <CardProposalEditor
            proposal={proposal}
            onUpdate={onUpdate}
            onAccept={onAccept}
            onReject={onReject}
            accepting={acceptingIds.has(proposal.id)}
          />
        </div>
      ))}
    </div>
  );
}
