import { Pool, PoolConfig, QueryResultRow } from "pg";
import { env } from "./env";

// Database configuration
const config: PoolConfig = env.DATABASE_URL
  ? {
      connectionString: env.DATABASE_URL,
      max: 20, // Maximum number of clients in pool
      idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
      connectionTimeoutMillis: 5000, // Return error after 5 seconds if connection not established
      ssl: env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
    }
  : {
      user: env.DB_USER,
      host: env.DB_HOST,
      database: env.DB_NAME,
      password: env.DB_PASSWORD,
      port: env.DB_PORT,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    };

// Create the connection pool
export const pool = new Pool(config);

// Handle pool errors
pool.on("error", (err, client) => {
  console.error("Unexpected error on idle client", err);
  // Don't exit the process, but log the error
});

// Handle pool connection events
pool.on("connect", () => {
  console.log("📊 New database client connected");
});

pool.on("remove", () => {
  console.log("🔌 Database client removed from pool");
});

/**
 * Test database connection
 * @returns Promise<boolean> - true if connection successful
 */
export const testConnection = async (): Promise<boolean> => {
  try {
    const res = await pool.query("SELECT NOW() as now, version() as version");
    console.log("✅ PostgreSQL connected successfully");
    console.log(`   Time: ${res.rows[0].now}`);
    console.log(`   Version: ${res.rows[0].version.split(",")[0]}`);
    return true;
  } catch (err) {
    console.error("❌ Database connection failed:", err);
    return false;
  }
};

/**
 * Execute a query with type safety
 * @param text - SQL query string
 * @param params - Query parameters
 * @returns Promise with typed result
 */
export const query = <T extends QueryResultRow = any>(
  text: string,
  params?: any[]
) => pool.query<T>(text, params);

/**
 * Get a client from the pool for transactions
 * @returns Promise with PoolClient
 */
export const getClient = () => pool.connect();

/**
 * Close all pool connections gracefully
 */
export const closePool = async (): Promise<void> => {
  try {
    await pool.end();
    console.log("🔒 Database pool closed successfully");
  } catch (err) {
    console.error("Error closing database pool:", err);
    throw err;
  }
};
