import express, { Application, Request, Response, NextFunction } from "express";
import bodyParser from "body-parser";
import helmet from "helmet";
import hpp from "hpp";
import cookieParser from "cookie-parser";
import compression from "compression";
import cors from "cors";
import { randomUUID } from "crypto";

import { env } from "./config/env.js";
import { getPublicJwks } from "./config/jwt.js";
import authRouter from "./routes/authRoutes.js";
import userRouter from "./routes/userRoutes.js";
import AppError from "./utils/appError.js";
import globalErrorHandler from "./controllers/errorController.js";
import { globalLimiter } from "./middleware/rateLimiter.js";
import { httpLogger } from "./utils/logger.js";
import { mongoSanitize } from "./middleware/sanitize.js";
import { metricsMiddleware, metricsEndpoint } from "./middleware/metrics.js";

const app: Application = express();

// Trust proxy (for rate limiting and IP detection)
app.set("trust proxy", env.TRUST_PROXY);

// CORS configuration
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// Security HTTP headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

// request ID middlware
app.use((req: any, _res, next) => {
  req.id = randomUUID();
  next();
});

// Body parser
app.use(bodyParser.json({ limit: "10kb" }));

// Cookie parser
app.use(cookieParser());

// Data sanitization against NoSQL query injection
app.use(
  mongoSanitize({
    onSanitize: "error", // or "remove" to silently remove
    logAttempts: true,
  }),
);

// Prevent parameter pollution
app.use(
  hpp({
    whitelist: ["role", "specializations"],
  }),
);

// Compression
app.use(compression());

// Request timestamp
app.use((req: Request, res: Response, next: NextFunction) => {
  req.requestTime = new Date().toISOString();
  next();
});

app.use(httpLogger);

// Use metrics middleware
app.use(metricsMiddleware);

// JWKS endpoint
app.get("/.well-known/jwks.json", (req: Request, res: Response) => {
  res.json(getPublicJwks());
});

// Health check
app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "auth",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.get("/metrics", metricsEndpoint);

// API routes
app.use("/", authRouter);
app.use("/api/v1/users", globalLimiter, userRouter);

// 404 handler
app.use((req: Request, res: Response, next: NextFunction) => {
  next(AppError.notFound(`Cannot find ${req.originalUrl} on this server`));
});

// Global error handler
app.use(globalErrorHandler);

export default app;
