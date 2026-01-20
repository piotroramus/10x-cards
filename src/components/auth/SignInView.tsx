import React from "react";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { SignInForm } from "./SignInForm";

interface SignInViewProps {
  returnUrl?: string;
  prefilledEmail?: string;
}

/**
 * SignInView - Client-side wrapper that provides AuthProvider
 * This ensures AuthProvider is available when SignInForm uses hooks
 */
export function SignInView({ returnUrl, prefilledEmail }: SignInViewProps) {
  return (
    <AuthProvider>
      <SignInForm returnUrl={returnUrl} prefilledEmail={prefilledEmail} />
    </AuthProvider>
  );
}
