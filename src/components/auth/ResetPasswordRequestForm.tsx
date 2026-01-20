import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/db/database.types";

// Create Supabase client for password reset
// Use PUBLIC_ prefixed env vars for client-side access
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_KEY || import.meta.env.SUPABASE_KEY;
const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

/**
 * ResetPasswordRequestForm component for requesting password reset email
 * Handles email input and displays success message after submission
 */
export function ResetPasswordRequestForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailValid = email.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailValid) return;

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const redirectTo = `${window.location.origin}/auth/reset-password/confirm`;
      
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo,
        },
      );

      if (resetError) {
        setError(resetError.message || "An error occurred. Please try again.");
        return;
      }

      setSuccess(true);
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="w-full max-w-md space-y-6">
        <div
          className={cn(
            "rounded-md border border-green-500/50 bg-green-500/10 p-4",
            "dark:bg-green-500/20"
          )}
          role="alert"
          aria-live="assertive"
        >
          <div className="flex items-start gap-3">
            <CheckCircle2
              className="size-5 shrink-0 text-green-600 dark:text-green-400"
              aria-hidden="true"
            />
            <div className="flex-1 space-y-2">
              <p className="text-sm font-medium text-green-600 dark:text-green-400">
                Password reset email sent
              </p>
              <p className="text-sm text-muted-foreground">
                Check your inbox at <strong>{email}</strong> for instructions to reset your password.
                If you don't see the email, check your spam folder.
              </p>
            </div>
          </div>
        </div>

        <div className="text-center">
          <a
            href="/auth/sign-in"
            className="text-sm text-primary hover:underline"
          >
            Back to sign in
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Reset password</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter your email address and we'll send you a link to reset your password
        </p>
      </div>

      {error && (
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
            <p className="flex-1 text-sm font-medium text-destructive">{error}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="reset-email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="reset-email"
            type="email"
            value={email}
            onChange={handleEmailChange}
            required
            autoComplete="email"
            className={cn(
              "w-full rounded-md border bg-background px-3 py-2 text-sm",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              !emailValid && email.length > 0 &&
                "border-destructive focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40"
            )}
            aria-invalid={!emailValid && email.length > 0}
            aria-describedby={!emailValid && email.length > 0 ? "reset-email-error" : undefined}
          />
          {!emailValid && email.length > 0 && (
            <p
              id="reset-email-error"
              className="text-xs text-destructive"
              role="alert"
            >
              Please enter a valid email address
            </p>
          )}
        </div>

        <Button
          type="submit"
          disabled={!emailValid || loading}
          className="w-full"
        >
          {loading && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          {loading ? "Sending..." : "Send reset link"}
        </Button>
      </form>

      <div className="text-center">
        <a
          href="/auth/sign-in"
          className="text-sm text-primary hover:underline"
        >
          Back to sign in
        </a>
      </div>
    </div>
  );
}
