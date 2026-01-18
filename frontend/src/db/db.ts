import Dexie, { type Table } from "dexie";
import {
  type Booking,
  type Client,
  type Payment,
  type Staff,
  type SyncLog,
  type Conflict,
  type DatabaseExport,
} from "../types/index.js";

export class SalonDatabase extends Dexie {
  bookings!: Table<Booking, number>;
  clients!: Table<Client, number>;
  payments!: Table<Payment, number>;
  staff!: Table<Staff, number>;
  sync_log!: Table<SyncLog, number>;
  conflicts!: Table<Conflict, number>;

  constructor() {
    super("SalonDB");

    this.version(1).stores({
      bookings:
        "++id, client_id, booking_date, sync_status, created_at, updated_at",
      clients: "++id, email, phone, sync_status, created_at, updated_at",
      payments: "++id, booking_id, sync_status, created_at",
      staff: "++id, email, sync_status",
      sync_log: "++id, entity_type, entity_id, timestamp, status",
      conflicts: "++id, entity_type, entity_id, created_at",
    });
  }
}

export const db = new SalonDatabase();

/**
 * Initialize IndexedDB database
 */
export const initDB = async (): Promise<boolean> => {
  try {
    await db.open();
    console.log("IndexedDB initialized successfully");
    return true;
  } catch (error) {
    console.error("Failed to initialize IndexedDB:", error);
    return false;
  }
};

/**
 * Clean up old data (keep last 30 days)
 */
export const cleanupOldData = async (): Promise<void> => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const cutoffDate = thirtyDaysAgo.toISOString();

  try {
    await db.bookings
      .where("created_at")
      .below(cutoffDate)
      .and((booking) => booking.sync_status === "synced")
      .delete();

    await db.sync_log.where("timestamp").below(cutoffDate).delete();

    console.log("Old data cleaned up successfully");
  } catch (error) {
    console.error("Error cleaning up old data:", error);
  }
};

/**
 * Export all records for debugging
 */
export const exportData = async (): Promise<DatabaseExport> => {
  return {
    bookings: await db.bookings.toArray(),
    clients: await db.clients.toArray(),
    payments: await db.payments.toArray(),
    sync_log: await db.sync_log.toArray(),
    conflicts: await db.conflicts.toArray(),
  };
};

/**
 * Clear all data from database
 */
export const clearAllData = async (): Promise<void> => {
  await db.bookings.clear();
  await db.clients.clear();
  await db.payments.clear();
  await db.staff.clear();
  await db.sync_log.clear();
  await db.conflicts.clear();
};

/**
 * Get database statistics
 */
export const getDBStats = async () => {
  return {
    bookings: await db.bookings.count(),
    clients: await db.clients.count(),
    payments: await db.payments.count(),
    staff: await db.staff.count(),
    sync_log: await db.sync_log.count(),
    conflicts: await db.conflicts.count(),
    pending: await db.bookings.where("sync_status").equals("pending").count(),
  };
};
