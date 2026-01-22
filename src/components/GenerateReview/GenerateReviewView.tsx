import React from "react";
import { GenerateReviewContainer } from "./GenerateReviewContainer";
import { PendingProposalsProvider, AuthProvider, AnalyticsProvider } from "@/components/providers";
import { AppHeader } from "@/components/AppHeader";
import { ToastContainer } from "@/components/Toast";

/**
 * GenerateReviewView - Client-side wrapper that provides all context providers
 * This ensures all providers are available when GenerateReviewContainer uses hooks
 */
export function GenerateReviewView() {
  return (
    <AuthProvider>
      <div className="min-h-screen flex flex-col">
        <AppHeader />
        <main className="flex-1">
          <PendingProposalsProvider>
            <AnalyticsProvider>
              <GenerateReviewContainer />
            </AnalyticsProvider>
          </PendingProposalsProvider>
        </main>
        <ToastContainer />
      </div>
    </AuthProvider>
  );
}

