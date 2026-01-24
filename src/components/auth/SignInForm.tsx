import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/providers/AuthProvider";

interface SignInFormProps {
  returnUrl?: string;
  prefilledEmail?: string;
}

// No longer create a separate Supabase client - use the one from AuthProvider
// to avoid "Multiple GoTrueClient instances" warning

/**
 * SignInForm component for user authentication
 * Handles email/password sign-in with validation and error display
 */
export function SignInForm({ returnUrl, prefilledEmail = "" }: SignInFormProps) {
  const { signIn, resendVerificationEmail } = useAuth();
  const [email, setEmail] = useState(prefilledEmail);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResendVerification, setShowResendVerification] = useState(false);

  // Store returnUrl in sessionStorage for persistence
  useEffect(() => {
    if (returnUrl) {
      sessionStorage.setItem("authReturnUrl", returnUrl);
    }
  }, [returnUrl]);

  // Trim email to remove whitespace
  const trimmedEmail = email.trim();
  const emailValid = trimmedEmail.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);
  const passwordValid = password.length > 0;
  const isValid = emailValid && passwordValid;

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setEmail(newValue);
    setError(null);
    setShowResendVerification(false);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setPassword(newValue);
    setError(null);
  };

  // Handle autofill by checking input values periodically and on various events
  useEffect(() => {
    const emailInput = document.getElementById("signin-email") as HTMLInputElement;
    const passwordInput = document.getElementById("signin-password") as HTMLInputElement;

    if (!emailInput || !passwordInput) return;

    const syncEmail = () => {
      const currentValue = emailInput.value;
      if (currentValue !== email) {
        setEmail(currentValue);
      }
    };

    const syncPassword = () => {
      const currentValue = passwordInput.value;
      if (currentValue !== password) {
        setPassword(currentValue);
      }
    };

    // Listen for various events that might indicate autofill
    emailInput.addEventListener("input", syncEmail);
    passwordInput.addEventListener("input", syncPassword);
    emailInput.addEventListener("change", syncEmail);
    passwordInput.addEventListener("change", syncPassword);
    emailInput.addEventListener("blur", syncEmail);
    passwordInput.addEventListener("blur", syncPassword);

    // Also check periodically (for autofill that doesn't fire events)
    const interval = setInterval(() => {
      syncEmail();
      syncPassword();
    }, 200);

    return () => {
      emailInput.removeEventListener("input", syncEmail);
      passwordInput.removeEventListener("input", syncPassword);
      emailInput.removeEventListener("change", syncEmail);
      passwordInput.removeEventListener("change", syncPassword);
      emailInput.removeEventListener("blur", syncEmail);
      passwordInput.removeEventListener("blur", syncPassword);
      clearInterval(interval);
    };
  }, [email, password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setLoading(true);
    setError(null);
    setShowResendVerification(false);

    try {
      // Use trimmed email for sign-in
      const { error: signInError } = await signIn(trimmedEmail, password);

      if (signInError) {
        const errorMessage = signInError.message.toLowerCase();

        // Check for email verification errors
        if (
          errorMessage.includes("email_not_confirmed") ||
          errorMessage.includes("email not confirmed") ||
          errorMessage.includes("not verified")
        ) {
          setError("Please verify your email address before signing in. Check your inbox for the verification link.");
          setShowResendVerification(true);
        } else if (errorMessage.includes("invalid login credentials") || errorMessage.includes("invalid credentials")) {
          setError("Invalid email or password");
        } else {
          setError(signInError.message || "An error occurred. Please try again.");
        }
        return;
      }

      // Success - wait a moment for cookies to be set, then redirect
      // Small delay to ensure cookies are set by createBrowserClient
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Get returnUrl from sessionStorage or prop, then navigate
      const storedReturnUrl = sessionStorage.getItem("authReturnUrl");
      const finalReturnUrl = returnUrl || storedReturnUrl || "/";
      sessionStorage.removeItem("authReturnUrl");

      // Use window.location for full page reload to ensure middleware runs
      window.location.href = finalReturnUrl;
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!trimmedEmail) {
      setError("Please enter your email address first");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: resendError } = await resendVerificationEmail(trimmedEmail);

      if (resendError) {
        setError(resendError.message || "Failed to resend verification email. Please try again.");
      } else {
        setError(null);
        // Show success message (you could use a toast here)
        alert("Verification email sent! Please check your inbox.");
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Check if Supabase env vars are configured
  const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || import.meta.env.SUPABASE_URL;
  const supabaseKey = import.meta.env.PUBLIC_SUPABASE_KEY || import.meta.env.SUPABASE_KEY;
  const hasSupabaseConfig = !!(supabaseUrl && supabaseKey);

  return (
    <div className="w-full max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Sign in</h1>
        <p className="mt-2 text-sm text-muted-foreground">Enter your email and password to access your account</p>
      </div>

      {!hasSupabaseConfig && (
        <div
          className={cn("rounded-md border border-destructive/50 bg-destructive/10 p-4", "dark:bg-destructive/20")}
          role="alert"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="size-5 shrink-0 text-destructive" aria-hidden="true" />
            <div className="flex-1 space-y-2">
              <p className="text-sm font-medium text-destructive">Configuration Error</p>
              <p className="text-xs text-muted-foreground">
                Supabase environment variables are missing. Please add to your .env file:
                <br />
                <code className="mt-1 block rounded bg-muted p-2 text-xs">
                  PUBLIC_SUPABASE_URL=your_supabase_url
                  <br />
                  PUBLIC_SUPABASE_KEY=your_supabase_anon_key
                </code>
              </p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div
          className={cn("rounded-md border border-destructive/50 bg-destructive/10 p-4", "dark:bg-destructive/20")}
          role="alert"
          aria-live="assertive"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="size-5 shrink-0 text-destructive" aria-hidden="true" />
            <div className="flex-1 space-y-2">
              <p className="text-sm font-medium text-destructive">{error}</p>
              {showResendVerification && (
                <Button variant="outline" size="sm" onClick={handleResendVerification} className="h-8">
                  Resend verification email
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="signin-email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="signin-email"
            type="email"
            value={email}
            onChange={handleEmailChange}
            onInput={(e) => {
              const target = e.target as HTMLInputElement;
              setEmail(target.value);
            }}
            onBlur={(e) => {
              const newValue = e.target.value;
              if (newValue !== email) {
                setEmail(newValue);
              }
            }}
            required
            autoComplete="email"
            className={cn(
              "w-full rounded-md border bg-background px-3 py-2 text-sm",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              !emailValid &&
                email.length > 0 &&
                "border-destructive focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40"
            )}
            aria-invalid={!emailValid && email.length > 0}
            aria-describedby={!emailValid && email.length > 0 ? "signin-email-error" : undefined}
          />
          {!emailValid && email.length > 0 && (
            <p id="signin-email-error" className="text-xs text-destructive" role="alert">
              Please enter a valid email address
            </p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="signin-password" className="text-sm font-medium">
              Password
            </label>
            <a href="/auth/reset-password" className="text-xs text-primary hover:underline">
              Forgot password?
            </a>
          </div>
          <input
            id="signin-password"
            type="password"
            value={password}
            onChange={handlePasswordChange}
            onInput={(e) => {
              const target = e.target as HTMLInputElement;
              setPassword(target.value);
            }}
            onBlur={(e) => {
              const newValue = e.target.value;
              if (newValue !== password) {
                setPassword(newValue);
              }
            }}
            required
            autoComplete="current-password"
            className={cn(
              "w-full rounded-md border bg-background px-3 py-2 text-sm",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              !passwordValid &&
                password.length > 0 &&
                "border-destructive focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40"
            )}
            aria-invalid={!passwordValid && password.length > 0}
          />
        </div>

        <Button
          type="submit"
          disabled={!isValid || loading}
          className="w-full"
          title={`Email valid: ${emailValid}, Password valid: ${passwordValid}, Is valid: ${isValid}`}
        >
          {loading && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          {loading ? "Signing in..." : "Sign in"}
        </Button>
      </form>

      <div className="text-center text-sm">
        <span className="text-muted-foreground">Don&apos;t have an account? </span>
        <a
          href={`/auth/sign-up${returnUrl ? `?returnUrl=${encodeURIComponent(returnUrl)}` : ""}`}
          className="text-primary hover:underline"
        >
          Sign up
        </a>
      </div>
    </div>
  );
}
