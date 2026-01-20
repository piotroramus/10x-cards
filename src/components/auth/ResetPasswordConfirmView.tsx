import React from "react";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { ResetPasswordConfirmForm } from "./ResetPasswordConfirmForm";

interface ResetPasswordConfirmViewProps {
  token: string;
}

/**
 * ResetPasswordConfirmView - Client-side wrapper that provides AuthProvider
 */
export function ResetPasswordConfirmView({ token }: ResetPasswordConfirmViewProps) {
  return (
    <AuthProvider>
      <ResetPasswordConfirmForm token={token} />
    </AuthProvider>
  );
}
