import React from "react";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { SignUpForm } from "./SignUpForm";

interface SignUpViewProps {
  returnUrl?: string;
}

/**
 * SignUpView - Client-side wrapper that provides AuthProvider
 * This ensures AuthProvider is available when SignUpForm uses hooks
 */
export function SignUpView({ returnUrl }: SignUpViewProps) {
  return (
    <AuthProvider>
      <SignUpForm returnUrl={returnUrl} />
    </AuthProvider>
  );
}
