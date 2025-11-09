import express, { Application, Request, Response, NextFunction } from "express";
import morgan from "morgan";
import helmet from "helmet";
import mongoSanitize from "express-mongo-sanitize";
import hpp from "hpp";
import cookieParser from "cookie-parser";
import compression from "compression";
import cors from "cors";

import { env, isDevelopment } from "./config/env.js";
import { getPublicJwks } from "./config/jwt.js";
import authRouter from "./routes/authRoutes.js";
import userRouter from "./routes/userRoutes.js";
import AppError from "./utils/appError.js";
import globalErrorHandler from "./controllers/errorController.js";
import { globalLimiter } from "./middleware/rateLimiter.js";
import { logger } from "./utils/logger.js";

const app: Application = express();

// Trust proxy (for rate limiting and IP detection)
app.enable("trust proxy");

// CORS configuration
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Security HTTP headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// Development logging
if (isDevelopment) {
  app.use(morgan("dev"));
} else {
  app.use(
    morgan("combined", {
      stream: {
        write: (message) => logger.info(message.trim()),
      },
    })
  );
}

// Body parser
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Prevent parameter pollution
app.use(
  hpp({
    whitelist: ["role", "specializations"],
  })
);

// Compression
app.use(compression());

// Request timestamp
app.use((req: Request, res: Response, next: NextFunction) => {
  req.requestTime = new Date().toISOString();
  next();
});

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

// API routes
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/users", globalLimiter, userRouter);

// 404 handler
app.all("*", (req: Request, res: Response, next: NextFunction) => {
  next(AppError.notFound(`Cannot find ${req.originalUrl} on this server`));
});

// Global error handler
app.use(globalErrorHandler);

export default app;
