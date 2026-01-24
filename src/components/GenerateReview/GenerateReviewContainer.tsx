import React, { useState, useCallback } from "react";
import { TextInputArea } from "./TextInputArea";
import { GenerateButton } from "./GenerateButton";
import { ErrorBanner } from "./ErrorBanner";
import { ProposalList } from "./ProposalList";
import { ManualCardForm } from "./ManualCardForm";
import { usePendingProposals } from "@/components/providers";
import { useAuth } from "@/components/providers";
import { useAnalytics } from "@/components/providers";
import { generateProposals, acceptProposal, createCard, mapErrorToBannerState } from "@/lib/api/cards";
import { ApiError } from "@/lib/api/cards";
import { toast } from "@/lib/utils/toast";
import type { GenerateProposalsCommand, AcceptProposalCommand, CreateCardCommand, GenerationState } from "@/types";

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
  const [textInputError, setTextInputError] = useState<string | undefined>(undefined);

  // Generation state
  const [generationState, setGenerationState] = useState<GenerationState>({
    isLoading: false,
    error: null,
    retryCount: 0,
  });

  // Manual form state
  const [isManualFormCollapsed] = useState(false);

  // Accept/Reject state
  const [acceptingIds, setAcceptingIds] = useState<Set<string>>(new Set());

  // Handle text input change
  const handleTextInputChange = useCallback(
    (value: string) => {
      setTextInput(value);
      // Clear errors when user starts typing
      if (textInputError) {
        setTextInputError(undefined);
      }
      if (generationState.error) {
        setGenerationState((prev) => ({ ...prev, error: null }));
      }
    },
    [textInputError, generationState.error]
  );

  // Handle generate proposals
  const handleGenerate = useCallback(async () => {
    // Validate input
    if (textInput.length === 0) {
      setTextInputError("Please enter some text to generate flashcard proposals");
      return;
    }

    if (textInput.length > 10000) {
      setTextInputError("Input must be 10,000 characters or less");
      return;
    }

    if (!isAuthenticated) {
      toast.error("Please sign in to generate proposals");
      return;
    }

    const token = getToken();
    if (!isAuthenticated || !token) {
      toast.error("Authentication required. Please sign in.");
      return;
    }

    // Clear any previous input errors
    setTextInputError(undefined);

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
      const bannerState =
        error instanceof ApiError
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

        const message = error instanceof ApiError ? error.message : "Failed to save card. Please try again.";
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
        const message = error instanceof ApiError ? error.message : "Failed to create card. Please try again.";
        toast.error(message);
      }
    },
    [getToken]
  );

  // Validation for generate button
  const canGenerate = !generationState.isLoading;
  const generateDisabledMessage = generationState.isLoading ? "Generating proposals..." : undefined;

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="grid gap-10 lg:grid-cols-2">
        {/* Left Column: Input Area */}
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Generate Cards from Text</h1>
            <p className="mt-3 text-base text-muted-foreground leading-relaxed">
              Paste your English text below and let AI generate flashcard proposals for you.
            </p>
          </div>

          <TextInputArea
            value={textInput}
            onChange={handleTextInputChange}
            disabled={generationState.isLoading}
            error={textInputError}
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

          <ManualCardForm onCreate={handleCreateManual} collapsed={isManualFormCollapsed} />
        </div>

        {/* Right Column: Proposals List */}
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">Proposals</h2>
            <p className="mt-2 text-base text-muted-foreground leading-relaxed">
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
