export type OutboxStatus = "pending" | "completed" | "failed";
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface OutboxTransaction {
  id: string;
  endpoint: string;
  method: HttpMethod;
  data: unknown;
  headers: Record<string, string>;
  status: OutboxStatus;
  retryCount: number;
  timestamp: number;
  createdAt: string;
  lastAttempt: string | null;
  error: string | null;
}

export interface OutboxStats {
  total: number;
  pending: number;
  failed: number;
  completed: number;
  oldestPending?: OutboxTransaction;
}

export interface OutboxConfig {
  maxRetries: number;
  retryDelays: number[];
  apiBaseUrl: string;
}

export interface OutboxEventMap {
  online: { type: "online" };
  offline: { type: "offline" };
  sync_started: { type: "sync_started" };
  sync_completed: { type: "sync_completed" };
  sync_error: { type: "sync_error"; error: Error };
  transaction_queued: {
    type: "transaction_queued";
    transaction: OutboxTransaction;
  };
  transaction_completed: {
    type: "transaction_completed";
    transaction: OutboxTransaction;
    result: unknown;
  };
  transaction_failed: {
    type: "transaction_failed";
    transaction: OutboxTransaction;
    error: string;
  };
  transaction_retry: {
    type: "transaction_retry";
    transaction: OutboxTransaction;
    retryCount: number;
    nextRetryIn: number;
  };
  transaction_deleted: { type: "transaction_deleted"; transactionId: string };
  completed_cleared: { type: "completed_cleared"; count: number };
}

export type OutboxEvent = OutboxEventMap[keyof OutboxEventMap];
export type OutboxEventListener = (event: OutboxEvent) => void;

export interface SubmitOptions {
  method?: HttpMethod;
  headers?: Record<string, string>;
  forceQueue?: boolean;
}

export interface SubmitResult {
  success: boolean;
  id?: string;
  data?: unknown;
  queued: boolean;
}

export interface UseOutboxReturn {
  isOnline: boolean;
  isSyncing: boolean;
  stats: OutboxStats;
  submitForm: <T = unknown>(
    endpoint: string,
    data: unknown,
    options?: SubmitOptions
  ) => Promise<SubmitResult>;
  retryFailed: (transactionId: string) => Promise<boolean>;
  deleteTransaction: (transactionId: string) => Promise<void>;
  clearCompleted: () => Promise<string[]>;
  forceSync: () => Promise<void>;
}
