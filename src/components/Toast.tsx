import React, { useState, useEffect } from "react";
import { toast, type Toast } from "@/lib/utils/toast";
import { cn } from "@/lib/utils";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

/**
 * Toast component that renders toast notifications
 */
export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const unsubscribe = toast.subscribe(setToasts);
    return unsubscribe;
  }, []);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none"
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
}

function ToastItem({ toast: t }: { toast: Toast }) {
  const handleDismiss = () => {
    toast.dismiss(t.id);
  };

  const Icon = t.type === "success" ? CheckCircle2 : t.type === "error" ? AlertCircle : Info;

  return (
    <div
      className={cn(
        "pointer-events-auto flex items-center gap-3 rounded-lg px-4 py-3 shadow-lg",
        "animate-in slide-in-from-right-full duration-300",
        "min-w-[320px] max-w-md",
        t.type === "success" && "bg-green-50 text-green-900 dark:bg-green-900/20 dark:text-green-100",
        t.type === "error" && "bg-red-50 text-red-900 dark:bg-red-900/20 dark:text-red-100",
        t.type === "info" && "bg-blue-50 text-blue-900 dark:bg-blue-900/20 dark:text-blue-100"
      )}
      role="alert"
    >
      <Icon className="size-5 shrink-0" aria-hidden="true" />
      <p className="flex-1 text-sm font-medium">{t.message}</p>
      <button
        onClick={handleDismiss}
        className={cn(
          "shrink-0 rounded-sm opacity-70 transition-opacity hover:opacity-100",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          t.type === "success" && "focus-visible:ring-green-600",
          t.type === "error" && "focus-visible:ring-red-600",
          t.type === "info" && "focus-visible:ring-blue-600"
        )}
        aria-label="Dismiss notification"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
