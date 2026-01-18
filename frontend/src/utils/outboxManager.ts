// Manages transaction queue, retry logic, and synchronization

import { outboxDB } from "./outboxDB";
import type {
  OutboxTransaction,
  OutboxConfig,
  OutboxEventListener,
  OutboxEvent,
  OutboxStats,
  HttpMethod,
  SubmitOptions,
  SubmitResult,
} from "../types/outbox";

class OutboxManager {
  private isOnline: boolean;
  private isSyncing: boolean;
  private listeners: Set<OutboxEventListener>;
  private config: OutboxConfig;

  constructor() {
    this.isOnline = navigator.onLine;
    this.isSyncing = false;
    this.listeners = new Set();
    this.config = {
      maxRetries: 3,
      retryDelays: [1000, 5000, 15000], // exponential backoff in ms
      apiBaseUrl: import.meta.env.VITE_API_BASE_URL || "http://localhost:4000",
    };
  }

  async initialize(): Promise<void> {
    await outboxDB.init();
    this.setupNetworkListeners();

    // Start sync if online
    if (this.isOnline) {
      this.startSync();
    }
  }

  private setupNetworkListeners(): void {
    window.addEventListener("online", () => {
      console.log("Network: Online");
      this.isOnline = true;
      this.notifyListeners({ type: "online" });
      this.startSync();
    });

    window.addEventListener("offline", () => {
      console.log("Network: Offline");
      this.isOnline = false;
      this.notifyListeners({ type: "offline" });
    });
  }

  subscribe(callback: OutboxEventListener): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(event: OutboxEvent): void {
    this.listeners.forEach((callback) => callback(event));
  }

  async queueTransaction(
    endpoint: string,
    method: HttpMethod,
    data: unknown,
    options: SubmitOptions = {}
  ): Promise<SubmitResult> {
    const transaction: Partial<OutboxTransaction> = {
      endpoint,
      method: method.toUpperCase() as HttpMethod,
      data,
      headers: options.headers || {},
    };

    try {
      const saved = await outboxDB.addTransaction(transaction);
      console.log("Transaction queued:", saved.id);

      this.notifyListeners({
        type: "transaction_queued",
        transaction: saved,
      });

      // Try to sync immediately if online
      if (this.isOnline) {
        this.startSync();
      }

      return { success: true, id: saved.id, queued: true };
    } catch (error) {
      console.error("Failed to queue transaction:", error);
      throw error;
    }
  }

  async startSync(): Promise<void> {
    if (this.isSyncing || !this.isOnline) {
      return;
    }

    this.isSyncing = true;
    this.notifyListeners({ type: "sync_started" });

    try {
      const pending = await outboxDB.getAllPending();
      console.log(`Syncing ${pending.length} pending transactions`);

      // Sort by timestamp (oldest first)
      pending.sort((a, b) => a.timestamp - b.timestamp);

      for (const transaction of pending) {
        await this.processTransaction(transaction);
      }

      this.notifyListeners({ type: "sync_completed" });
    } catch (error) {
      console.error("Sync error:", error);
      this.notifyListeners({
        type: "sync_error",
        error: error instanceof Error ? error : new Error(String(error)),
      });
    } finally {
      this.isSyncing = false;
    }
  }

  private async processTransaction(
    transaction: OutboxTransaction
  ): Promise<void> {
    if (!this.isOnline) {
      return;
    }

    try {
      // Update last attempt
      await outboxDB.updateTransaction(transaction.id, {
        lastAttempt: new Date().toISOString(),
      });

      // Make API call
      const response = await fetch(
        `${this.config.apiBaseUrl}${transaction.endpoint}`,
        {
          method: transaction.method,
          headers: {
            "Content-Type": "application/json",
            ...transaction.headers,
          },
          body:
            transaction.method !== "GET"
              ? JSON.stringify(transaction.data)
              : undefined,
        }
      );

      if (response.ok) {
        const result = await response.json();

        // Mark as completed
        await outboxDB.updateTransaction(transaction.id, {
          status: "completed",
          error: null,
        });

        this.notifyListeners({
          type: "transaction_completed",
          transaction: { ...transaction, status: "completed" },
          result,
        });

        console.log("Transaction completed:", transaction.id);
      } else {
        const errorText = await response.text();
        await this.handleFailedTransaction(
          transaction,
          `HTTP ${response.status}: ${response.statusText} - ${errorText}`
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      await this.handleFailedTransaction(transaction, errorMessage);
    }
  }

  private async handleFailedTransaction(
    transaction: OutboxTransaction,
    errorMessage: string
  ): Promise<void> {
    const newRetryCount = transaction.retryCount + 1;

    if (newRetryCount >= this.config.maxRetries) {
      // Max retries reached, mark as failed
      await outboxDB.updateTransaction(transaction.id, {
        status: "failed",
        retryCount: newRetryCount,
        error: errorMessage,
      });

      this.notifyListeners({
        type: "transaction_failed",
        transaction: { ...transaction, status: "failed" },
        error: errorMessage,
      });

      console.error(
        `Transaction failed after ${this.config.maxRetries} retries:`,
        transaction.id
      );
    } else {
      // Schedule retry
      await outboxDB.updateTransaction(transaction.id, {
        retryCount: newRetryCount,
        error: errorMessage,
      });

      const delay =
        this.config.retryDelays[newRetryCount - 1] ||
        this.config.retryDelays[this.config.retryDelays.length - 1];

      this.notifyListeners({
        type: "transaction_retry",
        transaction,
        retryCount: newRetryCount,
        nextRetryIn: delay,
      });

      console.log(
        `Retrying transaction ${transaction.id} in ${delay}ms (attempt ${newRetryCount})`
      );

      setTimeout(() => {
        if (this.isOnline) {
          this.processTransaction(transaction);
        }
      }, delay);
    }
  }

  async retryFailed(transactionId: string): Promise<boolean> {
    const transaction = await outboxDB.getTransaction(transactionId);

    if (!transaction || transaction.status !== "failed") {
      return false;
    }

    // Reset retry count and status
    await outboxDB.updateTransaction(transactionId, {
      status: "pending",
      retryCount: 0,
      error: null,
    });

    if (this.isOnline) {
      this.startSync();
    }

    return true;
  }

  async deleteTransaction(transactionId: string): Promise<void> {
    await outboxDB.deleteTransaction(transactionId);
    this.notifyListeners({
      type: "transaction_deleted",
      transactionId,
    });
  }

  async getStats(): Promise<OutboxStats> {
    return await outboxDB.getStats();
  }

  async clearCompleted(): Promise<string[]> {
    const deleted = await outboxDB.clearCompleted();
    this.notifyListeners({
      type: "completed_cleared",
      count: deleted.length,
    });
    return deleted;
  }

  getConfig(): OutboxConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<OutboxConfig>): void {
    this.config = { ...this.config, ...updates };
  }
}

export const outboxManager = new OutboxManager();
export default outboxManager;
