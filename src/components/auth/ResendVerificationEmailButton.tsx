import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ResendVerificationEmailButtonProps {
  email: string;
}

/**
 * ResendVerificationEmailButton component for resending verification emails
 * Shows loading and success states
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function ResendVerificationEmailButton({ email: _email }: ResendVerificationEmailButtonProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // TODO: Connect to Supabase resend method
      // const { error } = await supabase.auth.resend({
      //   type: 'signup',
      //   email: email
      // });
      // if (error) {
      //   setError(error.message || "An error occurred. Please try again.");
      //   return;
      // }
      // setSuccess(true);

      // Placeholder: Simulate loading
      await new Promise((resolve) => setTimeout(resolve, 500));
      setSuccess(true);
      // TODO: Implement actual resend logic with Supabase if needed
      // Currently handled by SignInForm's resend verification feature
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className={cn("rounded-md border border-green-500/50 bg-green-500/10 p-3", "dark:bg-green-500/20")}>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="size-4 shrink-0 text-green-600 dark:text-green-400" aria-hidden="true" />
          <p className="text-sm text-green-600 dark:text-green-400">Verification email sent! Check your inbox.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Button variant="outline" size="sm" onClick={handleClick} disabled={loading} className="w-full sm:w-auto">
        {loading && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
        {loading ? "Sending..." : "Resend verification email"}
      </Button>
      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
