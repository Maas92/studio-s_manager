// IndexedDB wrapper for persistent outbox storage

import type {
  OutboxTransaction,
  OutboxStatus,
  OutboxStats,
} from "../types/outbox";

const DB_NAME = "AppOutboxDB";
const DB_VERSION = 1;
const STORE_NAME = "transactions";

class OutboxDB {
  private db: IDBDatabase | null = null;

  async init(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
          store.createIndex("status", "status", { unique: false });
          store.createIndex("timestamp", "timestamp", { unique: false });
          store.createIndex("retryCount", "retryCount", { unique: false });
        }
      };
    });
  }

  async addTransaction(
    transaction: Partial<OutboxTransaction>
  ): Promise<OutboxTransaction> {
    if (!this.db) throw new Error("Database not initialized");

    const tx = this.db.transaction([STORE_NAME], "readwrite");
    const store = tx.objectStore(STORE_NAME);

    const record: OutboxTransaction = {
      id: transaction.id || this.generateId(),
      endpoint: transaction.endpoint!,
      method: transaction.method!,
      data: transaction.data,
      headers: transaction.headers || {},
      status: "pending" as OutboxStatus,
      retryCount: 0,
      timestamp: Date.now(),
      createdAt: new Date().toISOString(),
      lastAttempt: null,
      error: null,
    };

    return new Promise((resolve, reject) => {
      const request = store.add(record);
      request.onsuccess = () => resolve(record);
      request.onerror = () => reject(request.error);
    });
  }

  async getTransaction(id: string): Promise<OutboxTransaction | null> {
    if (!this.db) throw new Error("Database not initialized");

    const tx = this.db.transaction([STORE_NAME], "readonly");
    const store = tx.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllPending(): Promise<OutboxTransaction[]> {
    if (!this.db) throw new Error("Database not initialized");

    const tx = this.db.transaction([STORE_NAME], "readonly");
    const store = tx.objectStore(STORE_NAME);
    const index = store.index("status");

    return new Promise((resolve, reject) => {
      const request = index.getAll("pending");
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async updateTransaction(
    id: string,
    updates: Partial<OutboxTransaction>
  ): Promise<OutboxTransaction> {
    if (!this.db) throw new Error("Database not initialized");

    const tx = this.db.transaction([STORE_NAME], "readwrite");
    const store = tx.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const record = getRequest.result as OutboxTransaction | undefined;
        if (!record) {
          reject(new Error("Transaction not found"));
          return;
        }

        const updated = { ...record, ...updates };
        const putRequest = store.put(updated);

        putRequest.onsuccess = () => resolve(updated);
        putRequest.onerror = () => reject(putRequest.error);
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async deleteTransaction(id: string): Promise<boolean> {
    if (!this.db) throw new Error("Database not initialized");

    const tx = this.db.transaction([STORE_NAME], "readwrite");
    const store = tx.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  async clearCompleted(): Promise<string[]> {
    if (!this.db) throw new Error("Database not initialized");

    const tx = this.db.transaction([STORE_NAME], "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const index = store.index("status");

    return new Promise((resolve, reject) => {
      const request = index.openCursor(IDBKeyRange.only("completed"));
      const deleted: string[] = [];

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>)
          .result;
        if (cursor) {
          deleted.push(cursor.value.id);
          cursor.delete();
          cursor.continue();
        } else {
          resolve(deleted);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  async getStats(): Promise<OutboxStats> {
    if (!this.db) throw new Error("Database not initialized");

    const tx = this.db.transaction([STORE_NAME], "readonly");
    const store = tx.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.getAll();

      request.onsuccess = () => {
        const all = request.result as OutboxTransaction[];
        const stats: OutboxStats = {
          total: all.length,
          pending: all.filter((t) => t.status === "pending").length,
          failed: all.filter((t) => t.status === "failed").length,
          completed: all.filter((t) => t.status === "completed").length,
          oldestPending: all
            .filter((t) => t.status === "pending")
            .sort((a, b) => a.timestamp - b.timestamp)[0],
        };
        resolve(stats);
      };

      request.onerror = () => reject(request.error);
    });
  }

  generateId(): string {
    return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const outboxDB = new OutboxDB();
export default outboxDB;
