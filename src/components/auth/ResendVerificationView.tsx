import React from "react";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { ResendVerificationEmailButton } from "./ResendVerificationEmailButton";

interface ResendVerificationViewProps {
  email: string;
}

/**
 * ResendVerificationView - Client-side wrapper that provides AuthProvider
 */
export function ResendVerificationView({ email }: ResendVerificationViewProps) {
  return (
    <AuthProvider>
      <ResendVerificationEmailButton email={email} />
    </AuthProvider>
  );
}
