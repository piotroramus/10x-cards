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
        "pointer-events-auto flex items-center gap-3 rounded-lg px-4 py-3 shadow-lg border transition-all",
        "animate-in slide-in-from-right-full duration-300",
        "min-w-[320px] max-w-md",
        t.type === "success" &&
          "bg-primary/10 text-primary border-primary/20 dark:bg-primary/15 dark:border-primary/30",
        t.type === "error" &&
          "bg-destructive/10 text-destructive border-destructive/20 dark:bg-destructive/15 dark:border-destructive/30",
        t.type === "info" && "bg-accent text-accent-foreground border-border"
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
          t.type === "success" && "focus-visible:ring-primary",
          t.type === "error" && "focus-visible:ring-destructive",
          t.type === "info" && "focus-visible:ring-ring"
        )}
        aria-label="Dismiss notification"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
