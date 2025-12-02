import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { env } from "../config/env.js";

// Normalize IP fallback (handles IPv4, ::ffff: mapped IPv4, and removes IPv6 scope ids)
function normalizeIp(req: any): string {
  const xff = req.headers["x-forwarded-for"];
  let ip = "";
  if (xff) {
    ip = Array.isArray(xff) ? xff[0] : String(xff).split(",")[0].trim();
  } else if (req.connection?.remoteAddress) {
    ip = req.connection.remoteAddress;
  } else if (req.socket?.remoteAddress) {
    ip = req.socket.remoteAddress;
  } else if (req.ip) {
    ip = req.ip;
  }
  if (ip && ip.startsWith("::ffff:")) ip = ip.replace("::ffff:", "");
  ip = ip.split("%")[0];
  return ip || "unknown";
}

// A keyGenerator wrapper that uses library helper when available (to satisfy express-rate-limit validation),
// otherwise falls back to normalizeIp.
function keyGenerator(req: any) {
  try {
    // ipKeyGenerator is present in recent versions; calling it satisfies the express-rate-limit checks
    if (typeof ipKeyGenerator === "function") {
      // ipKeyGenerator expects the raw request object
      return ipKeyGenerator(req);
    }
  } catch (err) {
    // ignore and fallback
  }
  return normalizeIp(req);
}

export const apiLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window for login attempts
  message: "Too many login attempts, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  // skipSuccessfulRequests: true,
});
