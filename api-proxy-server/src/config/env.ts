import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(4000),
  AUTH_SERVICE_URL: z.string().url(),
  INVENTORY_SERVICE_URL: z.string().url(),
  FRONTEND_URL: z.string().url().default("http://localhost:3000"),

  // allow a comma-separated list of origins; transform into string[]
  // Example .env: FRONTEND_URLS=http://localhost:5173,http://frontend:5173
  FRONTEND_URLS: z.string().optional(),

  JWT_ISSUER: z.string().default("studio-s-auth"),
  JWT_AUDIENCE: z.string().default("studio-s-clients"),
  GATEWAY_SECRET: z
    .string()
    .min(32, "GATEWAY_SECRET must be at least 32 characters"),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  JWKS_URL: z
    .string()
    .url()
    .default("http://localhost:5002/.well-known/jwks.json"),
});

export type Env = z.infer<typeof envSchema>;

let env: Env;

try {
  env = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error("❌ Invalid environment variables:");
    error.issues.forEach((err) => {
      console.error(`  - ${err.path.join(".")}: ${err.message}`);
    });
  }
  process.exit(1);
}

export { env };
