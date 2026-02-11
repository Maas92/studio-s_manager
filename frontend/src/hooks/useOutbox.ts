// React hook for easy integration with your components

import { useState, useEffect, useCallback } from "react";
import { outboxManager } from "../utils/outboxManager";
import type {
  UseOutboxReturn,
  OutboxStats,
  SubmitOptions,
  SubmitResult,
  HttpMethod,
} from "../types/outbox";

const initialStats: OutboxStats = {
  total: 0,
  pending: 0,
  failed: 0,
  completed: 0,
};

export const useOutbox = (): UseOutboxReturn => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [stats, setStats] = useState<OutboxStats>(initialStats);

  // Initialize outbox manager
  useEffect(() => {
    outboxManager.initialize();
  }, []);

  // Subscribe to outbox events
  useEffect(() => {
    const unsubscribe = outboxManager.subscribe((event) => {
      switch (event.type) {
        case "online":
          setIsOnline(true);
          break;
        case "offline":
          setIsOnline(false);
          break;
        case "sync_started":
          setIsSyncing(true);
          break;
        case "sync_completed":
        case "sync_error":
          setIsSyncing(false);
          updateStats();
          break;
        case "transaction_queued":
        case "transaction_completed":
        case "transaction_failed":
        case "transaction_deleted":
          updateStats();
          break;
        default:
          break;
      }
    });

    // Initial stats
    updateStats();

    return unsubscribe;
  }, []);

  const updateStats = useCallback(async () => {
    try {
      const newStats = await outboxManager.getStats();
      setStats(newStats);
    } catch (error) {
      console.error("Failed to update outbox stats:", error);
    }
  }, []);

  // Submit form data (optimistic pattern)
  const submitForm = useCallback(
    async <T = unknown>(
      endpoint: string,
      data: unknown,
      options: SubmitOptions = {},
    ): Promise<SubmitResult> => {
      const method = (options.method || "POST") as HttpMethod;
      const config = outboxManager.getConfig();

      try {
        if (isOnline && !options.forceQueue) {
          // Try direct submission if online
          const response = await fetch(`${config.apiBaseUrl}${endpoint}`, {
            method,
            headers: {
              "Content-Type": "application/json",
              ...options.headers,
            },
            credentials: "include", // 👈 Include cookies for authentication
            body: JSON.stringify(data),
          });

          if (response.ok) {
            const result = await response.json();
            // Extract data from backend response wrapper (e.g., { status, data: { ... } })
            const actualData = result?.data || result;
            return { success: true, data: actualData, queued: false };
          } else {
            // Failed, queue it
            return await outboxManager.queueTransaction(
              endpoint,
              method,
              data,
              options,
            );
          }
        } else {
          // Offline, queue immediately
          return await outboxManager.queueTransaction(
            endpoint,
            method,
            data,
            options,
          );
        }
      } catch (error) {
        // Network error, queue it
        console.log("Network error, queuing transaction");
        return await outboxManager.queueTransaction(
          endpoint,
          method,
          data,
          options,
        );
      }
    },
    [isOnline],
  );

  const retryFailed = useCallback(
    async (transactionId: string): Promise<boolean> => {
      return await outboxManager.retryFailed(transactionId);
    },
    [],
  );

  const deleteTransaction = useCallback(
    async (transactionId: string): Promise<void> => {
      return await outboxManager.deleteTransaction(transactionId);
    },
    [],
  );

  const clearCompleted = useCallback(async (): Promise<string[]> => {
    return await outboxManager.clearCompleted();
  }, []);

  const forceSync = useCallback(async (): Promise<void> => {
    if (isOnline) {
      await outboxManager.startSync();
    }
  }, [isOnline]);

  return {
    isOnline,
    isSyncing,
    stats,
    submitForm,
    retryFailed,
    deleteTransaction,
    clearCompleted,
    forceSync,
  };
};
