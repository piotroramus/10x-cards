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
        <div
          key={index}
          className="relative overflow-hidden space-y-4 rounded-md border-l-[3px] border-l-primary border-y border-r bg-card p-5 shadow-sm before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-primary/10 before:to-transparent"
        >
          <div className="space-y-2">
            <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
            <div className="h-3 w-1/4 rounded bg-muted animate-pulse" />
          </div>
          <div className="space-y-2">
            <div className="h-20 w-full rounded bg-muted animate-pulse" />
            <div className="h-3 w-1/4 rounded bg-muted animate-pulse" />
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-20 rounded bg-primary/20 animate-pulse" />
            <div className="h-9 w-20 rounded bg-muted animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}
