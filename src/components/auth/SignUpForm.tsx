import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/providers/AuthProvider";

interface SignUpFormProps {
  returnUrl?: string;
}

/**
 * SignUpForm component for user registration
 * Handles email/password sign-up with validation and error display
 */
export function SignUpForm({ returnUrl }: SignUpFormProps) {
  const { signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailValid = email.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const passwordValid = password.length >= 8;
  const passwordConfirmationValid = passwordConfirmation === password && passwordConfirmation.length > 0;
  const isValid = emailValid && passwordValid && passwordConfirmationValid;

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    setError(null);
  };

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
      // Set email redirect URL for verification email
      const emailRedirectTo = `${window.location.origin}/auth/verify/success`;
      
      const { error: signUpError } = await signUp(email, password, {
        emailRedirectTo,
      });

      if (signUpError) {
        const errorMessage = signUpError.message.toLowerCase();
        
        if (
          errorMessage.includes("user already registered") ||
          errorMessage.includes("already registered") ||
          errorMessage.includes("email already")
        ) {
          setError("This email is already registered");
        } else if (errorMessage.includes("password")) {
          setError("Password must be at least 8 characters");
        } else {
          setError(signUpError.message || "An error occurred. Please try again.");
        }
        return;
      }

      // Success - navigate to verification check page
      const verifyUrl = `/auth/verify/check?email=${encodeURIComponent(email)}${
        returnUrl ? `&returnUrl=${encodeURIComponent(returnUrl)}` : ""
      }`;
      window.location.href = verifyUrl;
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Sign up</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Create an account to get started
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
          <label htmlFor="signup-email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="signup-email"
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
            aria-describedby={!emailValid && email.length > 0 ? "signup-email-error" : undefined}
          />
          {!emailValid && email.length > 0 && (
            <p
              id="signup-email-error"
              className="text-xs text-destructive"
              role="alert"
            >
              Please enter a valid email address
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="signup-password" className="text-sm font-medium">
            Password
          </label>
          <input
            id="signup-password"
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
            aria-describedby={!passwordValid && password.length > 0 ? "signup-password-error" : undefined}
          />
          {!passwordValid && password.length > 0 && (
            <p
              id="signup-password-error"
              className="text-xs text-destructive"
              role="alert"
            >
              Password must be at least 8 characters
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="signup-password-confirmation" className="text-sm font-medium">
            Confirm Password
          </label>
          <input
            id="signup-password-confirmation"
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
            aria-describedby={!passwordConfirmationValid && passwordConfirmation.length > 0 ? "signup-password-confirmation-error" : undefined}
          />
          {!passwordConfirmationValid && passwordConfirmation.length > 0 && (
            <p
              id="signup-password-confirmation-error"
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
          {loading ? "Creating account..." : "Sign up"}
        </Button>
      </form>

      <div className="text-center text-sm">
        <span className="text-muted-foreground">Already have an account? </span>
        <a
          href={`/auth/sign-in${returnUrl ? `?returnUrl=${encodeURIComponent(returnUrl)}` : ""}`}
          className="text-primary hover:underline"
        >
          Sign in
        </a>
      </div>
    </div>
  );
}
