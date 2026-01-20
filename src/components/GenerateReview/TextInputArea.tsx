import React from "react";
import { CharacterCounter } from "./CharacterCounter";
import { cn } from "@/lib/utils";

interface TextInputAreaProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
  placeholder?: string;
  maxLength?: number;
}

/**
 * TextInputArea component for pasted text input
 * Large textarea with integrated character counter and validation feedback
 */
export function TextInputArea({
  value,
  onChange,
  disabled = false,
  error,
  placeholder = "Paste your text here (up to 10,000 characters)...",
  maxLength = 10000,
}: TextInputAreaProps) {
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    // Enforce max length on client side
    if (newValue.length <= maxLength) {
      onChange(newValue);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    // Allow paste, but onChange will handle length validation
    // Additional sanitization can be added here if needed
  };

  const hasError = error || value.length > maxLength;
  const showError = value.length > maxLength;

  return (
    <div className="space-y-2">
      <label htmlFor="text-input" className="sr-only">
        Text input for card generation
      </label>
      <div className="relative">
        <textarea
          id="text-input"
          value={value}
          onChange={handleChange}
          onPaste={handlePaste}
          disabled={disabled}
          placeholder={placeholder}
          maxLength={maxLength}
          rows={12}
          className={cn(
            "w-full rounded-md border bg-background px-3 py-2 text-sm",
            "placeholder:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "resize-y",
            hasError &&
              "border-destructive focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40"
          )}
          aria-invalid={hasError}
          aria-describedby={error ? "text-input-error" : undefined}
        />
        <div className="absolute bottom-2 right-2">
          <CharacterCounter
            current={value.length}
            max={maxLength}
            label="Text input character count"
            showError={showError}
          />
        </div>
      </div>
      {error && (
        <p
          id="text-input-error"
          className="text-sm text-destructive"
          role="alert"
        >
          {error}
        </p>
      )}
      {showError && !error && (
        <p className="text-sm text-destructive" role="alert">
          Input must be {maxLength.toLocaleString()} characters or less
        </p>
      )}
    </div>
  );
}

