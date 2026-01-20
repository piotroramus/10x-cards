import React, { createContext, useContext, useEffect, useRef, useCallback } from "react";
import type { TrackEventCommand } from "@/types";
import { useAuth } from "./AuthProvider";

interface AnalyticsContextValue {
  trackEvent: (command: TrackEventCommand) => void;
}

const AnalyticsContext = createContext<AnalyticsContextValue | undefined>(undefined);

const STORAGE_KEY = "analytics-queue";
const BATCH_INTERVAL_MS = 2000; // 2 seconds
const MAX_BATCH_SIZE = 10;

interface QueuedEvent {
  command: TrackEventCommand;
  timestamp: number;
}

interface AnalyticsProviderProps {
  children: React.ReactNode;
}

/**
 * AnalyticsProvider manages analytics event queuing and batch sending
 * Handles offline persistence and fire-and-forget pattern
 * Note: Must be used within AuthProvider to access authentication token
 */
export function AnalyticsProvider({
  children,
}: AnalyticsProviderProps) {
  const { getToken } = useAuth();
  const queueRef = useRef<QueuedEvent[]>([]);
  const intervalRef = useRef<number | null>(null);
  const processingRef = useRef(false);

  // Load queue from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as QueuedEvent[];
        queueRef.current = parsed;
      }
    } catch (error) {
      console.warn("Failed to load analytics queue from localStorage:", error);
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Ignore
      }
    }
  }, []);

  // Save queue to localStorage whenever it changes
  const saveQueue = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(queueRef.current));
    } catch (error) {
      // Handle quota exceeded silently
      if (error instanceof DOMException && error.name === "QuotaExceededError") {
        // Clear old events if quota exceeded
        queueRef.current = queueRef.current.slice(-MAX_BATCH_SIZE);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(queueRef.current));
        } catch {
          // Ignore
        }
      }
    }
  }, []);

  // Process and send events in batch
  const processQueue = useCallback(async () => {
    if (processingRef.current || queueRef.current.length === 0) {
      return;
    }

    processingRef.current = true;

    try {
      const token = getToken();
      if (!token) {
        // Not authenticated - keep events in queue
        processingRef.current = false;
        return;
      }

      // Take up to MAX_BATCH_SIZE events
      const batch = queueRef.current.splice(0, MAX_BATCH_SIZE);

      // Send events in parallel (fire-and-forget)
      const promises = batch.map(async (queuedEvent) => {
        try {
          const response = await fetch("/api/analytics/events", {
            method: "POST",
            headers: {
              "Authorization": token,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(queuedEvent.command),
          });

          if (!response.ok) {
            // Re-queue on failure (up to a limit)
            if (queuedEvent.timestamp > Date.now() - 3600000) {
              // Only re-queue if less than 1 hour old
              queueRef.current.push(queuedEvent);
            }
          }
        } catch (error) {
          // Network error - re-queue
          if (queuedEvent.timestamp > Date.now() - 3600000) {
            queueRef.current.push(queuedEvent);
          }
        }
      });

      // Fire and forget - don't await
      Promise.allSettled(promises).then(() => {
        saveQueue();
        processingRef.current = false;
      });
    } catch (error) {
      console.warn("Error processing analytics queue:", error);
      processingRef.current = false;
    }
  }, [getToken, saveQueue]);

  // Set up interval for batch processing
  useEffect(() => {
    intervalRef.current = window.setInterval(() => {
      processQueue();
    }, BATCH_INTERVAL_MS);

    // Process immediately on mount if there are queued events
    if (queueRef.current.length > 0) {
      processQueue();
    }

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
    };
  }, [processQueue]);

  // Process queue before page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (queueRef.current.length > 0) {
        // Use sendBeacon for reliable delivery on page unload
        const token = getToken();
        if (token) {
          const batch = queueRef.current.splice(0, MAX_BATCH_SIZE);
          batch.forEach((queuedEvent) => {
            try {
              const blob = new Blob(
                [JSON.stringify(queuedEvent.command)],
                { type: "application/json" }
              );
              navigator.sendBeacon(
                "/api/analytics/events",
                blob
              );
            } catch {
              // Ignore sendBeacon errors
            }
          });
        }
        saveQueue();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [getToken, saveQueue]);

  const trackEvent = useCallback(
    (command: TrackEventCommand) => {
      const queuedEvent: QueuedEvent = {
        command,
        timestamp: Date.now(),
      };

      queueRef.current.push(queuedEvent);
      saveQueue();

      // Trigger immediate processing if queue is getting large
      if (queueRef.current.length >= MAX_BATCH_SIZE) {
        processQueue();
      }
    },
    [saveQueue, processQueue]
  );

  const value: AnalyticsContextValue = {
    trackEvent,
  };

  return <AnalyticsContext.Provider value={value}>{children}</AnalyticsContext.Provider>;
}

/**
 * Hook to access analytics context
 * @throws Error if used outside AnalyticsProvider
 */
export function useAnalytics(): AnalyticsContextValue {
  const context = useContext(AnalyticsContext);
  if (context === undefined) {
    throw new Error("useAnalytics must be used within an AnalyticsProvider");
  }
  return context;
}

