import React from "react";
import { GenerateReviewContainer } from "./GenerateReviewContainer";
import { PendingProposalsProvider, AuthProvider, AnalyticsProvider } from "@/components/providers";

/**
 * GenerateReviewView - Client-side wrapper that provides all context providers
 * This ensures all providers are available when GenerateReviewContainer uses hooks
 */
export function GenerateReviewView() {
  return (
    <AuthProvider>
      <PendingProposalsProvider>
        <AnalyticsProvider>
          <GenerateReviewContainer />
        </AnalyticsProvider>
      </PendingProposalsProvider>
    </AuthProvider>
  );
}

