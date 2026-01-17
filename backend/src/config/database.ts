import { Pool, PoolConfig, QueryResultRow } from "pg";
import { createClient } from "@supabase/supabase-js";
import { env } from "./env.js";
import { logger, logDatabaseConnection } from "../utils/logger.js";

/**
 * PostgreSQL pool configuration
 */
const config: PoolConfig = {
  connectionString: env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  ssl:
    env.DB_SSL === "true" || Boolean(env.DATABASE_URL)
      ? { rejectUnauthorized: env.DB_SSL === "true" ? false : true }
      : false,
};

/**
 * Create PostgreSQL connection pool
 */
export const pool = new Pool(config);

/**
 * Pool-level error handling
 */
pool.on("error", (err) => {
  logger.error({ err }, "🚨 Unexpected PostgreSQL pool error");
});

/**
 * Pool connection events
 */
pool.on("connect", () => {
  logDatabaseConnection("success", {
    engine: "postgres",
  });
});

pool.on("remove", () => {
  logger.info("🔌 PostgreSQL client removed from pool");
});

/**
 * Test database connectivity
 */
export const testConnection = async (): Promise<boolean> => {
  try {
    const res = await pool.query("SELECT NOW() as now, version() as version");

    logger.info(
      {
        time: res.rows[0].now,
        version: res.rows[0].version.split(",")[0],
      },
      "✅ PostgreSQL connected successfully"
    );

    return true;
  } catch (err) {
    logger.error({ err }, "❌ PostgreSQL connection failed");
    return false;
  }
};

/**
 * Typed query helper
 */
export const query = <T extends QueryResultRow = any>(
  text: string,
  params?: any[]
) => pool.query<T>(text, params);

/**
 * Get a pooled client (for transactions)
 */
export const getClient = () => pool.connect();

/**
 * Gracefully close PostgreSQL pool
 */
export const closePool = async (): Promise<void> => {
  try {
    await pool.end();
    logger.warn("🔒 PostgreSQL pool closed");
  } catch (err) {
    logger.error({ err }, "❌ Error closing PostgreSQL pool");
    throw err;
  }
};

/**
 * Supabase client (service role)
 */
const supabaseUrl = env.SUPABASE_URL || "";
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Initialize Supabase storage buckets
 */
export async function initializeStorage(): Promise<void> {
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();

    if (error) {
      logger.error({ error }, "❌ Failed to list Supabase buckets");
      throw error;
    }

    const receiptsBucket = buckets?.find(
      (bucket) => bucket.name === "expense-receipts"
    );

    if (!receiptsBucket) {
      const { data, error } = await supabase.storage.createBucket(
        "expense-receipts",
        {
          public: true,
          fileSizeLimit: 5 * 1024 * 1024, // 5MB
          allowedMimeTypes: [
            "image/jpeg",
            "image/png",
            "image/jpg",
            "application/pdf",
          ],
        }
      );

      if (error) {
        logger.error({ error }, "❌ Failed to create storage bucket");
        throw error;
      }

      logger.info({ bucket: data?.name }, "✅ Supabase storage bucket created");
    } else {
      logger.info("✅ Supabase storage bucket already exists");
    }
  } catch (error) {
    logger.error({ error }, "❌ Storage initialization failed");
    throw error;
  }
}
