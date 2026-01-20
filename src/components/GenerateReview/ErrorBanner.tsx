import React from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ErrorBannerState } from "@/types";

interface ErrorBannerProps {
  error: ErrorBannerState | null;
  onRetry?: () => void;
  onDismiss?: () => void;
}

/**
 * ErrorBanner component for displaying generation failures and errors
 * Provides retry functionality and user-friendly error messages
 */
export function ErrorBanner({
  error,
  onRetry,
  onDismiss,
}: ErrorBannerProps) {
  if (!error) {
    return null;
  }

  return (
    <div
      className={cn(
        "rounded-md border border-destructive/50 bg-destructive/10 p-4",
        "dark:bg-destructive/20"
      )}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-start gap-3">
        <AlertCircle
          className="size-5 shrink-0 text-destructive"
          aria-hidden="true"
        />
        <div className="flex-1 space-y-2">
          <p className="text-sm font-medium text-destructive">
            {error.message}
          </p>
          {error.retryable && error.retryCount !== undefined && (
            <p className="text-xs text-muted-foreground">
              Retry attempt: {error.retryCount} / 2
            </p>
          )}
          <div className="flex gap-2">
            {error.retryable && onRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                className="h-8"
              >
                Retry
              </Button>
            )}
          </div>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="shrink-0 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            aria-label="Dismiss error"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}

