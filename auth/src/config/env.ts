import { z } from "zod";
import "dotenv/config";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.string().transform(Number).default(5002),
  
  // MongoDB
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  
  // JWT
  JWT_ISSUER: z.string().default("studio-s-auth"),
  JWT_AUDIENCE: z.string().default("studio-s-clients"),
  JWT_KID: z.string().default("studio-s-auth-1"),
  JWT_PRIVATE_PEM: z.string().optional(),
  JWT_PUBLIC_PEM: z.string().optional(),
  ACCESS_TOKEN_TTL_SEC: z.string().transform(Number).default(900),
  REFRESH_TOKEN_TTL_SEC: z.string().transform(Number).default(1209600),
  
  // Cookie settings
  COOKIE_DOMAIN: z.string().default("localhost"),
  COOKIE_SECURE: z.string().transform(val => val === "true").default(false),
  COOKIE_SAMESITE: z.enum(["lax", "strict", "none"]).default("lax"),
  
  // CORS
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  
  // JWKS
  SELF_JWKS_URL: z.string().url().default("http://localhost:5002/.well-known/jwks.json"),
  
  // Logging
  LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).default("info"),
});

export type Environment = z.infer<typeof envSchema>;

export const env = envSchema.parse(process.env);

// Export commonly used values
export const isProduction = env.NODE_ENV === "production";
export const isDevelopment = env.NODE_ENV === "development";
export const isTest = env.NODE_ENV === "test";