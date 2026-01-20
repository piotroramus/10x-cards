import React from "react";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { ResetPasswordRequestForm } from "./ResetPasswordRequestForm";

/**
 * ResetPasswordRequestView - Client-side wrapper that provides AuthProvider
 */
export function ResetPasswordRequestView() {
  return (
    <AuthProvider>
      <ResetPasswordRequestForm />
    </AuthProvider>
  );
}
