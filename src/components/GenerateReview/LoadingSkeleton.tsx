import React from "react";

interface LoadingSkeletonProps {
  count?: number;
}

/**
 * LoadingSkeleton component with shimmer effect
 * Displayed during AI generation to indicate loading state
 */
export function LoadingSkeleton({ count = 3 }: LoadingSkeletonProps) {
  return (
    <div className="space-y-4" aria-label="Loading proposals" aria-live="polite">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="animate-pulse space-y-4 rounded-md border bg-card p-4">
          <div className="space-y-2">
            <div className="h-4 w-3/4 rounded bg-muted" />
            <div className="h-3 w-1/4 rounded bg-muted" />
          </div>
          <div className="space-y-2">
            <div className="h-20 w-full rounded bg-muted" />
            <div className="h-3 w-1/4 rounded bg-muted" />
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-20 rounded bg-muted" />
            <div className="h-9 w-20 rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}
