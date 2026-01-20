import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/providers/AuthProvider";

interface ResetPasswordConfirmFormProps {
  token?: string;
}

/**
 * ResetPasswordConfirmForm component for setting new password after clicking reset link
 * Handles password and password confirmation with validation
 */
export function ResetPasswordConfirmForm({ token }: ResetPasswordConfirmFormProps) {
  const { resetPasswordConfirm } = useAuth();
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordValid = password.length >= 8;
  const passwordConfirmationValid = passwordConfirmation === password && passwordConfirmation.length > 0;
  const isValid = passwordValid && passwordConfirmationValid;

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    setError(null);
  };

  const handlePasswordConfirmationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordConfirmation(e.target.value);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setLoading(true);
    setError(null);

    try {
      // Supabase automatically handles the token from the URL hash/query params
      // When user clicks the reset link, Supabase sets up a session
      // We just need to update the password using that session
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        const errorMessage = updateError.message.toLowerCase();
        
        if (
          errorMessage.includes("expired") ||
          errorMessage.includes("invalid") ||
          errorMessage.includes("token")
        ) {
          setError(
            "Password reset link has expired or is invalid. Please request a new one.",
          );
        } else {
          setError(updateError.message || "An error occurred. Please try again.");
        }
        return;
      }

      // Success - navigate to sign-in with success message
      window.location.href = "/auth/sign-in?message=password_reset_success";
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Set new password</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter your new password below
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
            <div className="flex-1 space-y-2">
              <p className="text-sm font-medium text-destructive">{error}</p>
              {error.includes("expired") && (
                <a
                  href="/auth/reset-password"
                  className="text-xs text-primary hover:underline"
                >
                  Request a new password reset link
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="reset-confirm-password" className="text-sm font-medium">
            New Password
          </label>
          <input
            id="reset-confirm-password"
            type="password"
            value={password}
            onChange={handlePasswordChange}
            required
            autoComplete="new-password"
            minLength={8}
            className={cn(
              "w-full rounded-md border bg-background px-3 py-2 text-sm",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              !passwordValid && password.length > 0 &&
                "border-destructive focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40"
            )}
            aria-invalid={!passwordValid && password.length > 0}
            aria-describedby={!passwordValid && password.length > 0 ? "reset-confirm-password-error" : undefined}
          />
          {!passwordValid && password.length > 0 && (
            <p
              id="reset-confirm-password-error"
              className="text-xs text-destructive"
              role="alert"
            >
              Password must be at least 8 characters
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="reset-confirm-password-confirmation" className="text-sm font-medium">
            Confirm New Password
          </label>
          <input
            id="reset-confirm-password-confirmation"
            type="password"
            value={passwordConfirmation}
            onChange={handlePasswordConfirmationChange}
            required
            autoComplete="new-password"
            className={cn(
              "w-full rounded-md border bg-background px-3 py-2 text-sm",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              !passwordConfirmationValid && passwordConfirmation.length > 0 &&
                "border-destructive focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40"
            )}
            aria-invalid={!passwordConfirmationValid && passwordConfirmation.length > 0}
            aria-describedby={!passwordConfirmationValid && passwordConfirmation.length > 0 ? "reset-confirm-password-confirmation-error" : undefined}
          />
          {!passwordConfirmationValid && passwordConfirmation.length > 0 && (
            <p
              id="reset-confirm-password-confirmation-error"
              className="text-xs text-destructive"
              role="alert"
            >
              Passwords do not match
            </p>
          )}
        </div>

        <Button
          type="submit"
          disabled={!isValid || loading}
          className="w-full"
        >
          {loading && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          {loading ? "Resetting password..." : "Reset password"}
        </Button>
      </form>
    </div>
  );
}
