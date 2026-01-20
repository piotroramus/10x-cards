import React from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface GenerateButtonProps {
  onClick: () => void;
  disabled: boolean;
  loading: boolean;
  disabledMessage?: string;
}

/**
 * GenerateButton component for triggering AI proposal generation
 * Displays loading state during generation and disabled state when input is invalid
 */
export function GenerateButton({
  onClick,
  disabled,
  loading,
  disabledMessage,
}: GenerateButtonProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "Enter" && !disabled && !loading) {
      onClick();
    }
  };

  return (
    <div className="space-y-1">
      <Button
        onClick={onClick}
        onKeyDown={handleKeyDown}
        disabled={disabled || loading}
        className="w-full"
        size="lg"
        aria-label={loading ? "Generating proposals..." : "Generate card proposals"}
      >
        {loading ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            <span>Generating...</span>
          </>
        ) : (
          <span>Generate</span>
        )}
      </Button>
      {disabled && disabledMessage && (
        <p className="text-xs text-muted-foreground text-center" role="status">
          {disabledMessage}
        </p>
      )}
    </div>
  );
}

