import "dotenv/config";

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 5002),
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  mongoUri: process.env.MONGODB_URI!,
  accessTtlSec: Number(process.env.ACCESS_TOKEN_TTL_SEC ?? 900),
  refreshTtlSec: Number(process.env.REFRESH_TOKEN_TTL_SEC ?? 60 * 60 * 24 * 14),
  cookie: {
    domain: process.env.COOKIE_DOMAIN ?? "localhost",
    secure: process.env.COOKIE_SECURE === "true",
    sameSite:
      (process.env.COOKIE_SAMESITE as "lax" | "strict" | "none") ?? "lax",
  },
  jwtPrivatePem: process.env.JWT_PRIVATE_PEM,
  jwtPublicPem: process.env.JWT_PUBLIC_PEM,
};

if (!env.mongoUri) throw new Error("Missing MONGODB_URI");
