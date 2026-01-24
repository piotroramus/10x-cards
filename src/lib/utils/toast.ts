/**
 * Simple toast notification system
 * Can be replaced with Shadcn/ui Toast component later
 */

export type ToastType = "success" | "error" | "info";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

type ToastListener = (toasts: Toast[]) => void;

class ToastManager {
  private toasts: Toast[] = [];
  private listeners = new Set<ToastListener>();

  subscribe(listener: ToastListener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => listener([...this.toasts]));
  }

  show(message: string, type: ToastType = "info", duration = 3000) {
    const id = crypto.randomUUID();
    const toast: Toast = { id, message, type, duration };

    this.toasts.push(toast);
    this.notify();

    if (duration > 0) {
      setTimeout(() => {
        this.dismiss(id);
      }, duration);
    }

    return id;
  }

  dismiss(id: string) {
    this.toasts = this.toasts.filter((t) => t.id !== id);
    this.notify();
  }

  success(message: string, duration = 3000) {
    return this.show(message, "success", duration);
  }

  error(message: string, duration = 5000) {
    return this.show(message, "error", duration);
  }

  info(message: string, duration = 3000) {
    return this.show(message, "info", duration);
  }
}

export const toast = new ToastManager();
