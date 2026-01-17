import { Pool, PoolClient } from "pg";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {
  OutboxEntry,
  ConnectionStatus,
  WriteResult,
  SyncResult,
  SyncStatistics,
  EntityType,
} from "../types/index.js";

// Local PostgreSQL connection
const localPool = new Pool({
  host: process.env.LOCAL_DB_HOST || "localhost",
  port: parseInt(process.env.LOCAL_DB_PORT || "5432"),
  database: process.env.LOCAL_DB_NAME || "salon_local",
  user: process.env.LOCAL_DB_USER || "postgres",
  password: process.env.LOCAL_DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Supabase connection
const supabase: SupabaseClient = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

class OutboxService {
  public connectionStatus: ConnectionStatus = {
    supabase: true,
    lastCheck: new Date(),
    consecutiveFailures: 0,
  };

  /**
   * Check if Supabase is reachable
   */
  async checkSupabaseConnection(): Promise<boolean> {
    try {
      const { data, error } = await Promise.race<any>([
        supabase.from("health_check").select("count").limit(1),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), 5000)
        ),
      ]);

      this.connectionStatus.supabase = !error;
      this.connectionStatus.lastCheck = new Date();

      if (!error) {
        this.connectionStatus.consecutiveFailures = 0;
      } else {
        this.connectionStatus.consecutiveFailures++;
      }

      return !error;
    } catch (error) {
      const err = error as Error;
      console.error("Supabase connection check failed:", err.message);
      this.connectionStatus.supabase = false;
      this.connectionStatus.consecutiveFailures++;
      return false;
    }
  }

  /**
   * Add entry to outbox
   */
  async addToOutbox(
    eventType: string,
    entityType: EntityType,
    entityId: string | null,
    payload: Record<string, any>
  ): Promise<number> {
    const client = await localPool.connect();

    try {
      const query = `
        INSERT INTO outbox (event_type, entity_type, entity_id, payload)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `;

      const result = await client.query(query, [
        eventType,
        entityType,
        entityId,
        JSON.stringify(payload),
      ]);

      return result.rows[0].id;
    } finally {
      client.release();
    }
  }

  /**
   * Write to Supabase with outbox pattern
   */
  async writeWithOutbox(
    entityType: EntityType,
    operation: "create" | "update" | "delete",
    data: Record<string, any>
  ): Promise<WriteResult> {
    const isOnline = await this.checkSupabaseConnection();
    const client: PoolClient = await localPool.connect();

    try {
      await client.query("BEGIN");

      // Determine event type
      const eventType = `${entityType}_${operation}`;

      if (isOnline) {
        // Try to write directly to Supabase
        try {
          let supabaseResult: any;

          if (operation === "create") {
            const { data: insertData, error } = await supabase
              .from(entityType)
              .insert(data)
              .select()
              .single();

            if (error) throw error;
            supabaseResult = insertData;
          } else if (operation === "update") {
            const { data: updateData, error } = await supabase
              .from(entityType)
              .update(data)
              .eq("id", data.id)
              .select()
              .single();

            if (error) throw error;
            supabaseResult = updateData;
          } else if (operation === "delete") {
            const { error } = await supabase
              .from(entityType)
              .delete()
              .eq("id", data.id);

            if (error) throw error;
            supabaseResult = { deleted: true };
          }

          // Write to outbox as backup (with synced status)
          await client.query(
            `
            INSERT INTO outbox (
              event_type, entity_type, entity_id, payload, 
              sync_status, synced_at
            )
            VALUES ($1, $2, $3, $4, 'synced', NOW())
          `,
            [eventType, entityType, data.id || null, JSON.stringify(data)]
          );

          await client.query("COMMIT");
          return { success: true, data: supabaseResult };
        } catch (error) {
          console.error(
            "Supabase write failed, falling back to outbox:",
            error
          );
          await client.query("ROLLBACK");

          // Fall through to offline mode
          await client.query("BEGIN");
        }
      }

      // Offline mode - write to outbox only
      await client.query(
        `
        INSERT INTO outbox (
          event_type, entity_type, entity_id, payload, sync_status
        )
        VALUES ($1, $2, $3, $4, 'pending')
      `,
        [eventType, entityType, data.id || null, JSON.stringify(data)]
      );

      await client.query("COMMIT");

      return {
        success: true,
        offline: true,
        data,
        message: "Saved to outbox for later sync",
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get pending outbox entries
   */
  async getPendingEntries(limit: number = 100): Promise<OutboxEntry[]> {
    const query = `
      SELECT id, event_type, entity_type, entity_id, payload, retry_count
      FROM outbox
      WHERE sync_status = 'pending'
      ORDER BY created_at ASC
      LIMIT $1
    `;

    const result = await localPool.query(query, [limit]);
    return result.rows.map((row) => ({
      ...row,
      payload:
        typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload,
    }));
  }

  /**
   * Update outbox entry status
   */
  async updateOutboxStatus(
    id: number,
    status: string,
    errorMessage: string | null = null
  ): Promise<void> {
    const query = `
      UPDATE outbox
      SET 
        sync_status = $1,
        synced_at = CASE WHEN $1 = 'synced' THEN NOW() ELSE NULL END,
        error_message = $2,
        retry_count = retry_count + CASE WHEN $1 = 'failed' THEN 1 ELSE 0 END,
        last_retry_at = CASE WHEN $1 = 'failed' THEN NOW() ELSE last_retry_at END
      WHERE id = $3
    `;

    await localPool.query(query, [status, errorMessage, id]);
  }

  /**
   * Sync single outbox entry
   */
  async syncEntry(entry: OutboxEntry): Promise<SyncResult> {
    try {
      const [entityType, operation] = entry.event_type.split("_");
      let result: any;

      if (operation === "create" || operation === "created") {
        const { data, error } = await supabase
          .from(entityType as EntityType)
          .insert(entry.payload)
          .select()
          .single();

        if (error) throw error;
        result = data;
      } else if (operation === "update" || operation === "updated") {
        const { data, error } = await supabase
          .from(entityType as EntityType)
          .update(entry.payload)
          .eq("id", entry.entity_id)
          .select()
          .single();

        if (error) throw error;
        result = data;
      } else if (operation === "delete" || operation === "deleted") {
        const { error } = await supabase
          .from(entityType as EntityType)
          .delete()
          .eq("id", entry.entity_id);

        if (error) throw error;
        result = { deleted: true };
      }

      await this.updateOutboxStatus(entry.id, "synced");
      return { success: true, data: result };
    } catch (error) {
      const err = error as Error;
      console.error(`Failed to sync entry ${entry.id}:`, err);

      // Check if we should retry
      if (entry.retry_count >= 5) {
        await this.updateOutboxStatus(entry.id, "failed", err.message);
      } else {
        await this.updateOutboxStatus(entry.id, "pending", err.message);
      }

      return { success: false, error: err.message };
    }
  }

  /**
   * Get sync statistics
   */
  async getStatistics(): Promise<SyncStatistics> {
    const query = `SELECT * FROM get_sync_statistics()`;
    const result = await localPool.query(query);
    return result.rows[0];
  }

  /**
   * Archive old synced records
   */
  async archiveOldRecords(): Promise<number> {
    const query = `SELECT archive_old_outbox_records()`;
    const result = await localPool.query(query);
    return result.rows[0].archive_old_outbox_records;
  }

  /**
   * Clean up connection
   */
  async close(): Promise<void> {
    await localPool.end();
  }
}

export default new OutboxService();
