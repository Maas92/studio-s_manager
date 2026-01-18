import { CorsOptions } from "cors";
import { env } from "./env.js";
import logger from "../utils/logger.js";

// Parse FRONTEND_URLS from environment
// Handles: string with commas, array, or single URL
function parseAllowedOrigins(): string[] {
  const urls = env.FRONTEND_URLS || env.FRONTEND_URL;

  if (!urls) {
    logger.warn("[CORS] No FRONTEND_URLS or FRONTEND_URL configured");
    return [];
  }

  // If it's already an array, return it
  if (Array.isArray(urls)) {
    return urls;
  }

  // If it's a string, split by comma
  if (typeof urls === "string") {
    return urls
      .split(",")
      .map((url) => url.trim())
      .filter((url) => url.length > 0);
  }

  logger.warn(
    { type: typeof urls },
    "[CORS] FRONTEND_URLS has unexpected type"
  );
  return [];
}

const allowedOrigins = parseAllowedOrigins();

// Log configuration on startup
logger.info("[CORS] Configuration loaded");
logger.info({ allowedOrigins }, "[CORS] Allowed origins");
logger.info({ env: env.NODE_ENV }, "[CORS] Node environment");

export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (server-to-server, mobile apps, Postman)
    if (!origin) {
      logger.info("[CORS] Allowing request with no origin");
      return callback(null, true);
    }

    // Development mode: allow any localhost
    if (env.NODE_ENV === "development") {
      const isLocalhost = /^https?:\/\/localhost(:\d+)?$/.test(origin);
      if (isLocalhost) {
        logger.info({ origin }, "[CORS] Allowing localhost origin (dev mode)");
        return callback(null, true);
      }
    }

    // Check if origin is in allowed list
    const isAllowed = allowedOrigins.includes(origin);
    if (isAllowed) {
      logger.info({ origin }, "[CORS] Allowing whitelisted origin");
      return callback(null, true);
    }

    // Block all other origins
    logger.warn({ origin, allowedOrigins }, "[CORS] BLOCKED origin");

    const error = new Error(`Origin ${origin} not allowed by CORS policy`);
    return callback(error);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Request-ID",
    "X-Forwarded-For",
    "X-Forwarded-Proto",
    "X-Real-IP",
  ],
  exposedHeaders: ["X-Request-ID", "Set-Cookie"],
  maxAge: 86400, // 24 hours
  optionsSuccessStatus: 204,
};
