import express, { Application, Request, Response, NextFunction } from "express";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import {
  createProxyMiddleware,
  Options,
  RequestHandler,
} from "http-proxy-middleware";
import jwksRsa from "jwks-rsa";
import { expressjwt, Request as JWTRequest } from "express-jwt";
import crypto from "crypto";
import AppError from "./utils/appError.js";
import globalErrorHandler from "./controllers/errorController.js";

const app: Application = express();

// Trust proxy
app.set("trust proxy", 1);

// 1) GLOBAL MIDDLEWARES
app.use(helmet());

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Rate limiting
const limiter = rateLimit({
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100"),
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000"),
  message: "Too many requests from this IP, please try again later!",
});
app.use("/api", limiter);
app.use("/auth", limiter);

// Body parser
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());

// CORS
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);

// Request ID for correlation
app.use((req, _res, next) => {
  (req as any).requestId =
    req.headers["x-request-id"] ||
    crypto.randomUUID?.() ||
    Math.random().toString(36).slice(2);
  next();
});

// ---------- JWT (RS256 via JWKS) ----------
const ISSUER = process.env.JWT_ISSUER ?? "studio-s-auth";
const AUDIENCE = process.env.JWT_AUDIENCE ?? "studio-s-clients";
const AUTH_URL = process.env.AUTH_SERVICE_URL!;
const BACKEND_URL = process.env.INVENTORY_SERVICE_URL!; // your inventory/backend aggregator

const checkJwt = expressjwt({
  algorithms: ["RS256"],
  issuer: ISSUER,
  audience: AUDIENCE,
  credentialsRequired: true,
  requestProperty: "auth", // attaches to req.auth
  secret: jwksRsa.expressJwtSecret({
    jwksUri: `${AUTH_URL}/.well-known/jwks.json`,
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 10,
  }),
});

// ---------- Proxy Factory ----------
function makeProxy(target: string, pathRewrite?: Record<string, string>) {
  const options: Options = {
    target,
    changeOrigin: true,
    xfwd: true,
    proxyTimeout: 25_000,
    timeout: 25_000,
    pathRewrite,
    on: {
      proxyReq: (proxyReq, req: any, _res) => {
        // add correlation id
        proxyReq.setHeader("X-Request-ID", req.requestId);

        // propagate user claims if present (after checkJwt)
        if (req.auth) {
          const { sub, email, role } = req.auth as any;
          if (sub) proxyReq.setHeader("X-User-Id", String(sub));
          if (email) proxyReq.setHeader("X-User-Email", String(email));
          if (role) proxyReq.setHeader("X-User-Role", String(role));
        }
      },
      error: (err, _req, res) => {
        const response = res as Response;
        console.error("Proxy Error:", err?.message || err);
        response.status(503).json({
          status: "error",
          message: "Upstream service is unavailable",
        });
      },
    },
  };
  return createProxyMiddleware(options);
}

// ---------- Routes ----------

// Health for the gateway itself
app.get("/health", (_req, res) => res.json({ ok: true, service: "gateway" }));

// Public auth routes (no JWT here). They are handled by the Auth service.
app.use("/auth", makeProxy(AUTH_URL, { "^/auth": "/auth" }));

// EVERYTHING under /api requires a valid RS256 access token
app.use("/api", checkJwt);

// Users (lives in auth service; protected)
app.use(
  "/api/v1/users",
  makeProxy(AUTH_URL, { "^/api/v1/users": "/api/v1/users" })
);

// Inventory / products / categories / suppliers / locations — protected
app.use(
  "/api/v1/products",
  makeProxy(BACKEND_URL, { "^/api/v1/products": "/api/v1/products" })
);
app.use(
  "/api/v1/categories",
  makeProxy(BACKEND_URL, { "^/api/v1/categories": "/api/v1/categories" })
);
app.use(
  "/api/v1/suppliers",
  makeProxy(BACKEND_URL, { "^/api/v1/suppliers": "/api/v1/suppliers" })
);
app.use(
  "/api/v1/locations",
  makeProxy(BACKEND_URL, { "^/api/v1/locations": "/api/v1/locations" })
);

// 404 for undefined routes
app.all("*", (req: Request, _res: Response, next: NextFunction) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global error handler
app.use(globalErrorHandler);

export default app;
