import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { CardProposal, PendingProposalViewModel } from "@/types";

interface PendingProposalsContextValue {
  proposals: PendingProposalViewModel[];
  addProposals: (proposals: CardProposal[]) => void;
  updateProposal: (id: string, proposal: CardProposal) => void;
  removeProposal: (id: string) => void;
  clearAll: () => void;
}

const PendingProposalsContext = createContext<PendingProposalsContextValue | undefined>(undefined);

const STORAGE_KEY = "pending-proposals";

/**
 * Generates a temporary UUID for client-side proposal tracking
 */
function generateTemporaryId(): string {
  return crypto.randomUUID();
}

/**
 * Loads proposals from localStorage with error handling
 */
function loadFromStorage(): PendingProposalViewModel[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored) as CardProposal[];
    
    // Validate and convert to ViewModels with temporary IDs
    return parsed.map((proposal) => ({
      ...proposal,
      id: generateTemporaryId(), // Generate new IDs on load
    }));
  } catch (error) {
    // Corrupted data - clear and return empty
    console.warn("Failed to load pending proposals from localStorage:", error);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore removal errors
    }
    return [];
  }
}

/**
 * Saves proposals to localStorage with error handling
 */
function saveToStorage(proposals: CardProposal[]): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(proposals));
  } catch (error) {
    // Handle quota exceeded or other storage errors
    if (error instanceof DOMException && error.name === "QuotaExceededError") {
      console.warn("localStorage quota exceeded. Proposals will not persist across refreshes.");
      // Could emit an event or use a toast here to notify the user
    } else {
      console.warn("Failed to save pending proposals to localStorage:", error);
    }
  }
}

interface PendingProposalsProviderProps {
  children: React.ReactNode;
}

/**
 * PendingProposalsProvider manages pending proposal state with localStorage persistence
 * Generates temporary UUIDs for React keys and handles storage errors gracefully
 */
export function PendingProposalsProvider({ children }: PendingProposalsProviderProps) {
  // Start with empty array to match SSR, load from storage after hydration
  const [proposals, setProposals] = useState<PendingProposalViewModel[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load from localStorage after hydration (client-side only)
  useEffect(() => {
    setProposals(loadFromStorage());
    setIsHydrated(true);
  }, []);

  // Sync to localStorage whenever proposals change (after hydration)
  useEffect(() => {
    if (!isHydrated) return;
    
    // Convert ViewModels back to CardProposals for storage (remove temporary IDs)
    const proposalsToStore: CardProposal[] = proposals.map(({ id, ...proposal }) => proposal);
    saveToStorage(proposalsToStore);
  }, [proposals, isHydrated]);

  const addProposals = useCallback((newProposals: CardProposal[]) => {
    setProposals((prev) => {
      // Generate temporary IDs for new proposals
      const viewModels: PendingProposalViewModel[] = newProposals.map((proposal) => ({
        ...proposal,
        id: generateTemporaryId(),
      }));
      return [...prev, ...viewModels];
    });
  }, []);

  const updateProposal = useCallback((id: string, proposal: CardProposal) => {
    setProposals((prev) =>
      prev.map((p) => (p.id === id ? { ...proposal, id } : p))
    );
  }, []);

  const removeProposal = useCallback((id: string) => {
    setProposals((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setProposals([]);
    // Clear localStorage
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Ignore errors
      }
    }
  }, []);

  const value: PendingProposalsContextValue = {
    proposals,
    addProposals,
    updateProposal,
    removeProposal,
    clearAll,
  };

  return (
    <PendingProposalsContext.Provider value={value}>
      {children}
    </PendingProposalsContext.Provider>
  );
}

/**
 * Hook to access pending proposals context
 * @throws Error if used outside PendingProposalsProvider
 */
export function usePendingProposals(): PendingProposalsContextValue {
  const context = useContext(PendingProposalsContext);
  if (context === undefined) {
    throw new Error("usePendingProposals must be used within a PendingProposalsProvider");
  }
  return context;
}

