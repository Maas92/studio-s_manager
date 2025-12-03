import { z } from "zod";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const envSchema = z.object({
  // Node Environment
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(5002),

  // Gateway Secret for verifying requests
  GATEWAY_SECRET: z.string(),

  // Database Configuration
  DATABASE_URL: z.string().optional(),
  DB_USER: z.string().optional(),
  DB_HOST: z.string().optional(),
  DB_NAME: z.string().optional(),
  DB_PASSWORD: z.string().optional(),
  DB_PORT: z.coerce.number().optional().default(5432),
  DB_SSL: z.string().optional(),

  // CORS Configuration
  ALLOWED_ORIGINS: z.string().default("http://localhost:3000"),

  // Security
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000), // 15 minutes
});

// Parse and validate environment variables
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  console.error(JSON.stringify(parsed.error.flatten().fieldErrors, null, 2));
  throw new Error("Invalid environment configuration");
}

// Export validated environment variables
export const env = parsed.data;

// Type-safe access to environment variables
export type Env = z.infer<typeof envSchema>;
