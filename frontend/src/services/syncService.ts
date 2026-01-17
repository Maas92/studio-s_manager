import { db } from "../db/db";
import {
  type SyncEvent,
  type SyncResult,
  type ConflictDetection,
  type EntityType,
  type Booking,
  type Client,
  type Payment,
} from "../types/index.js";

const API_BASE_URL =
  process.env.REACT_APP_API_URL || "http://localhost:3000/api";
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000]; // Exponential backoff

type SyncListener = (event: SyncEvent) => void;
type EntityData = Booking | Client | Payment;

class SyncService {
  private syncing: boolean = false;
  private listeners: Set<SyncListener> = new Set();

  /**
   * Subscribe to sync events
   */
  subscribe(callback: SyncListener): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify all listeners
   */
  private notify(event: SyncEvent): void {
    this.listeners.forEach((callback) => callback(event));
  }

  /**
   * Get pending sync count
   */
  async getPendingSyncCount(): Promise<number> {
    const counts = await Promise.all([
      db.bookings.where("sync_status").equals("pending").count(),
      db.clients.where("sync_status").equals("pending").count(),
      db.payments.where("sync_status").equals("pending").count(),
    ]);
    return counts.reduce((sum, count) => sum + count, 0);
  }

  /**
   * Sync a single entity
   */
  async syncEntity(
    entityType: EntityType,
    entity: EntityData,
    retryCount: number = 0
  ): Promise<SyncResult> {
    const endpoint = `${API_BASE_URL}/${entityType}`;

    try {
      const isTemporaryId = entity.id.toString().startsWith("temp_");
      const method = entity.id && !isTemporaryId ? "PUT" : "POST";
      const url = method === "PUT" ? `${endpoint}/${entity.id}` : endpoint;

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
        body: JSON.stringify(entity),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const serverData = await response.json();

      // Update local record with server data
      const table = db[entityType];
      await table.update(entity.id, {
        ...serverData,
        sync_status: "synced",
        synced_at: new Date().toISOString(),
      });

      // Log success
      await db.sync_log.add({
        entity_type: entityType,
        entity_id: entity.id,
        timestamp: new Date().toISOString(),
        status: "success",
        action: method,
      });

      return { success: true, data: serverData };
    } catch (error) {
      const err = error as Error;
      console.error(`Sync failed for ${entityType}:`, err);

      // Retry logic
      if (retryCount < MAX_RETRIES) {
        await new Promise((resolve) =>
          setTimeout(resolve, RETRY_DELAYS[retryCount])
        );
        return this.syncEntity(entityType, entity, retryCount + 1);
      }

      // Mark as failed after max retries
      const table = db[entityType];
      await table.update(entity.id, {
        sync_status: "failed",
        error_message: err.message,
        retry_count: retryCount,
      } as Partial<EntityData>);

      // Log failure
      await db.sync_log.add({
        entity_type: entityType,
        entity_id: entity.id,
        timestamp: new Date().toISOString(),
        status: "failed",
        error: err.message,
        retry_count: retryCount,
      });

      return { success: false, error: err.message };
    }
  }

  /**
   * Sync all pending entities
   */
  async syncAll(): Promise<SyncResult> {
    if (this.syncing) {
      console.log("Sync already in progress");
      return { success: false, error: "Sync already in progress" };
    }

    this.syncing = true;
    this.notify({ type: "sync_start" });

    try {
      const entityTypes: EntityType[] = ["clients", "bookings", "payments"];
      let totalSynced = 0;
      let totalFailed = 0;

      for (const entityType of entityTypes) {
        const table = db[entityType];
        const pendingEntities = await table
          .where("sync_status")
          .equals("pending")
          .toArray();

        this.notify({
          type: "sync_progress",
          entityType,
          total: pendingEntities.length,
          current: 0,
        });

        for (let i = 0; i < pendingEntities.length; i++) {
          const entity = pendingEntities[i] as EntityData;
          const result = await this.syncEntity(entityType, entity);

          if (result.success) {
            totalSynced++;
          } else {
            totalFailed++;
          }

          this.notify({
            type: "sync_progress",
            entityType,
            total: pendingEntities.length,
            current: i + 1,
          });
        }
      }

      this.notify({
        type: "sync_complete",
        synced: totalSynced,
        failed: totalFailed,
      });

      return { success: true, synced: totalSynced, failed: totalFailed };
    } catch (error) {
      const err = error as Error;
      console.error("Sync error:", err);
      this.notify({ type: "sync_error", error: err.message });
      return { success: false, error: err.message };
    } finally {
      this.syncing = false;
    }
  }

  /**
   * Manual sync trigger
   */
  async triggerSync(): Promise<SyncResult> {
    if (!navigator.onLine) {
      throw new Error("Cannot sync while offline");
    }
    return this.syncAll();
  }

  /**
   * Check for conflicts
   */
  async detectConflicts(
    entityType: EntityType,
    localEntity: EntityData
  ): Promise<ConflictDetection | null> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/${entityType}/${localEntity.id}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
          },
        }
      );

      if (!response.ok) return null;

      const serverEntity = await response.json();

      // Compare updated_at timestamps
      const localTime = new Date(localEntity.updated_at);
      const serverTime = new Date(serverEntity.updated_at);

      if (serverTime > localTime) {
        // Server is newer - conflict detected
        await db.conflicts.add({
          entity_type: entityType,
          entity_id: localEntity.id,
          local_data: localEntity,
          server_data: serverEntity,
          created_at: new Date().toISOString(),
        });

        return {
          hasConflict: true,
          local: localEntity,
          server: serverEntity,
        };
      }

      return { hasConflict: false };
    } catch (error) {
      console.error("Conflict detection failed:", error);
      return null;
    }
  }

  /**
   * Resolve conflict
   */
  async resolveConflict(
    conflictId: number,
    resolution: "use_local" | "use_server" | "merge",
    data?: Record<string, any>
  ): Promise<void> {
    const conflict = await db.conflicts.get(conflictId);
    if (!conflict) throw new Error("Conflict not found");

    const table = db[conflict.entity_type as EntityType];
    const entityId = conflict.entity_id as number;

    if (resolution === "use_local") {
      // Keep local, sync to server
      await this.syncEntity(
        conflict.entity_type as EntityType,
        conflict.local_data as EntityData
      );
    } else if (resolution === "use_server") {
      // Use server version
      await table.update(entityId, {
        ...conflict.server_data,
        sync_status: "synced",
      });
    } else if (resolution === "merge" && data) {
      // Use merged data
      await table.update(entityId, {
        ...data,
        sync_status: "pending",
      });
      await this.syncEntity(
        conflict.entity_type as EntityType,
        data as EntityData
      );
    }

    // Delete conflict record
    await db.conflicts.delete(conflictId);
  }
}

export const syncService = new SyncService();

// Auto-sync on reconnection
window.addEventListener("online", () => {
  setTimeout(() => {
    syncService.triggerSync().catch(console.error);
  }, 2000);
});
