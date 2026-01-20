import React, { useState, useCallback } from "react";
import { TextInputArea } from "./TextInputArea";
import { GenerateButton } from "./GenerateButton";
import { ErrorBanner } from "./ErrorBanner";
import { LoadingSkeleton } from "./LoadingSkeleton";
import { ProposalList } from "./ProposalList";
import { ManualCardForm } from "./ManualCardForm";
import { usePendingProposals } from "@/components/providers";
import { useAuth } from "@/components/providers";
import { useAnalytics } from "@/components/providers";
import { generateProposals, acceptProposal, createCard, mapErrorToBannerState } from "@/lib/api/cards";
import { ApiError } from "@/lib/api/cards";
import { toast } from "@/lib/utils/toast";
import type {
  GenerateProposalsCommand,
  AcceptProposalCommand,
  CreateCardCommand,
  CardProposal,
  ErrorBannerState,
  GenerationState,
} from "@/types";

/**
 * GenerateReviewContainer - Main container component for Generate/Review view
 * Orchestrates text input, proposal generation, editing, acceptance, and manual creation
 */
export function GenerateReviewContainer() {
  // Context hooks
  const { proposals, addProposals, updateProposal, removeProposal } = usePendingProposals();
  const { isAuthenticated, getToken } = useAuth();
  const { trackEvent } = useAnalytics();

  // Text input state
  const [textInput, setTextInput] = useState("");

  // Generation state
  const [generationState, setGenerationState] = useState<GenerationState>({
    isLoading: false,
    error: null,
    retryCount: 0,
  });

  // Manual form state
  const [isManualFormCollapsed, setIsManualFormCollapsed] = useState(false);

  // Accept/Reject state
  const [acceptingIds, setAcceptingIds] = useState<Set<string>>(new Set());

  // Handle text input change
  const handleTextInputChange = useCallback((value: string) => {
    setTextInput(value);
    // Clear error when user starts typing
    if (generationState.error) {
      setGenerationState((prev) => ({ ...prev, error: null }));
    }
  }, [generationState.error]);

  // Handle generate proposals
  const handleGenerate = useCallback(async () => {
    if (!isAuthenticated) {
      toast.error("Please sign in to generate proposals");
      return;
    }

    if (textInput.length === 0 || textInput.length > 10000) {
      return;
    }

    const token = getToken();
    if (!isAuthenticated || !token) {
      toast.error("Authentication required. Please sign in.");
      return;
    }

    setGenerationState((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
    }));

    try {
      const command: GenerateProposalsCommand = { text: textInput };
      const response = await generateProposals(command, token);

      addProposals(response.proposals);
      setGenerationState({
        isLoading: false,
        error: null,
        retryCount: 0,
      });

      // Clear input after successful generation (optional)
      // setTextInput("");
    } catch (error) {
      const bannerState = error instanceof ApiError
        ? { ...mapErrorToBannerState(error), retryCount: generationState.retryCount }
        : {
            type: "NETWORK_ERROR" as const,
            message: "An unexpected error occurred. Please try again.",
            retryable: true,
            retryCount: generationState.retryCount,
          };

      setGenerationState({
        isLoading: false,
        error: bannerState,
        retryCount: generationState.retryCount,
      });
    }
  }, [textInput, isAuthenticated, getToken, addProposals, generationState.retryCount]);

  // Handle retry generation
  const handleRetryGeneration = useCallback(() => {
    if (generationState.retryCount >= 2) {
      toast.error("Maximum retry attempts reached. Please try again later.");
      return;
    }

    setGenerationState((prev) => ({
      ...prev,
      error: null,
      retryCount: prev.retryCount + 1,
    }));

    // Retry the generation
    handleGenerate();
  }, [generationState.retryCount, handleGenerate]);

  // Handle dismiss error
  const handleDismissError = useCallback(() => {
    setGenerationState((prev) => ({ ...prev, error: null }));
  }, []);

  // Handle update proposal
  const handleUpdateProposal = useCallback(
    (id: string, proposal: CardProposal) => {
      updateProposal(id, proposal);
    },
    [updateProposal]
  );

  // Handle accept proposal
  const handleAcceptProposal = useCallback(
    async (id: string, proposal: CardProposal) => {
      const token = getToken();
      if (!token) {
        toast.error("Authentication required. Please sign in.");
        return;
      }

      // Optimistic UI update - remove from list immediately
      const originalProposal = proposals.find((p) => p.id === id);
      removeProposal(id);
      setAcceptingIds((prev) => new Set(prev).add(id));

      try {
        const command: AcceptProposalCommand = {
          front: proposal.front,
          back: proposal.back,
        };
        await acceptProposal(command, token);

        // Success - proposal already removed, just clean up loading state
        setAcceptingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });

        toast.success("Card saved successfully");
        // Analytics event is created automatically by API
      } catch (error) {
        // Rollback optimistic update
        if (originalProposal) {
          addProposals([originalProposal]);
        }

        setAcceptingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });

        const message = error instanceof ApiError
          ? error.message
          : "Failed to save card. Please try again.";
        toast.error(message);
      }
    },
    [proposals, removeProposal, addProposals, getToken]
  );

  // Handle reject proposal
  const handleRejectProposal = useCallback(
    (id: string) => {
      removeProposal(id);
      // Track reject event asynchronously (fire-and-forget)
      trackEvent({
        event_type: "reject",
        origin: null,
        context: {},
      });
    },
    [removeProposal, trackEvent]
  );

  // Handle create manual card
  const handleCreateManual = useCallback(
    async (command: CreateCardCommand) => {
      const token = getToken();
      if (!token) {
        toast.error("Authentication required. Please sign in.");
        return;
      }

      try {
        await createCard(command, token);
        toast.success("Card created successfully");
        // Analytics event is created automatically by API
      } catch (error) {
        const message = error instanceof ApiError
          ? error.message
          : "Failed to create card. Please try again.";
        toast.error(message);
      }
    },
    [getToken]
  );

  // Validation for generate button
  const canGenerate = textInput.length > 0 && textInput.length <= 10000 && isAuthenticated && !generationState.isLoading;
  const generateDisabledMessage = !isAuthenticated
    ? "Please sign in to generate"
    : textInput.length > 10000
      ? "Input must be 10,000 characters or less"
      : textInput.length === 0
        ? "Enter text to generate proposals"
        : undefined;

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Left Column: Input Area */}
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-bold">Generate Cards from Text</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Paste your English text below and let AI generate flashcard proposals for you.
            </p>
          </div>

          <TextInputArea
            value={textInput}
            onChange={handleTextInputChange}
            disabled={generationState.isLoading}
            maxLength={10000}
          />

          <GenerateButton
            onClick={handleGenerate}
            disabled={!canGenerate}
            loading={generationState.isLoading}
            disabledMessage={generateDisabledMessage}
          />

          {generationState.error && (
            <ErrorBanner
              error={generationState.error}
              onRetry={generationState.error.retryable ? handleRetryGeneration : undefined}
              onDismiss={handleDismissError}
            />
          )}

          <ManualCardForm
            onCreate={handleCreateManual}
            collapsed={isManualFormCollapsed}
          />
        </div>

        {/* Right Column: Proposals List */}
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Proposals</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Review and edit proposals, then accept or reject them.
            </p>
          </div>

          <ProposalList
            proposals={proposals}
            onUpdate={handleUpdateProposal}
            onAccept={handleAcceptProposal}
            onReject={handleRejectProposal}
            loading={generationState.isLoading}
            acceptingIds={acceptingIds}
          />
        </div>
      </div>
    </div>
  );
}

