import { Pool, PoolConfig, QueryResultRow } from "pg";

const url = process.env.DATABASE_URL; // prefer a single URL
const config: PoolConfig = url
  ? {
      connectionString: url,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    }
  : {
      user: process.env.DB_USER || "postgres",
      host: process.env.DB_HOST || "localhost",
      database: process.env.DB_NAME || "inventory",
      password: process.env.DB_PASSWORD || "postgres",
      port: parseInt(process.env.DB_PORT || "5432"),
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    };

// Supabase often requires SSL in production:
if (process.env.DB_SSL?.toLowerCase() === "true") {
  (config as any).ssl = { rejectUnauthorized: false };
}

export const pool = new Pool(config);

export const query = <T extends QueryResultRow = any>(
  text: string,
  params?: any[]
) => pool.query<T>(text, params);
