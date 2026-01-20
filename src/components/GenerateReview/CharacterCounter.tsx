import React from "react";
import { cn } from "@/lib/utils";

interface CharacterCounterProps {
  current: number;
  max: number;
  label?: string;
  showError?: boolean;
}

/**
 * CharacterCounter component with color-coded feedback
 * Displays current character count and maximum limit with visual indicators
 * Color thresholds:
 * - Green: 0-80% of limit
 * - Yellow: 80-95% of limit
 * - Red: 95-100% of limit
 * - Exceeds limit: Red color + error styling
 */
export function CharacterCounter({
  current,
  max,
  label,
  showError = false,
}: CharacterCounterProps) {
  const percentage = (current / max) * 100;
  const exceedsLimit = current > max;

  // Determine color based on percentage and error state
  const getColorClass = () => {
    if (exceedsLimit || showError) {
      return "text-destructive";
    }
    if (percentage >= 95) {
      return "text-destructive";
    }
    if (percentage >= 80) {
      return "text-yellow-600 dark:text-yellow-500";
    }
    return "text-muted-foreground";
  };

  const colorClass = getColorClass();

  return (
    <div className="flex items-center justify-end gap-1 text-xs">
      <span
        className={cn(colorClass, exceedsLimit && "font-medium")}
        aria-live="polite"
        aria-atomic="true"
      >
        {current} / {max}
      </span>
      {label && (
        <span className="sr-only" aria-label={label}>
          {current} of {max} characters
        </span>
      )}
    </div>
  );
}

