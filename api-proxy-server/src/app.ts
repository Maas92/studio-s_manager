import express, { Application, Request, Response, NextFunction } from "express";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createProxyMiddleware, Options } from "http-proxy-middleware";
import jwksRsa from "jwks-rsa";
import { expressjwt, Request as JWTRequest } from "express-jwt";
import { corsOptions } from "./config/cors.js";
import AppError from "./utils/appError.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { logger } from "./utils/logger.js";
import { setupRoutes } from "./routes/index.js";
import { requestId } from "./middleware/requestId.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { env } from "./config/env.js";

const app: Application = express();

// Trust proxy
app.set("trust proxy", 1);

// 1) GLOBAL MIDDLEWARES
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

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

// CORS
app.use(cors(corsOptions));

// Body parser
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());

// Request ID for correlation
app.use(requestId);
if (env.NODE_ENV !== "test") {
  app.use(requestLogger);
}

// Setup routes
setupRoutes(app);

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

// 404 handler for undefined routes
app.all("*", (req: Request, res: Response, next: NextFunction) => {
  next(new AppError(`Cannot find ${req.originalUrl} on this server`, 404));
});

// Global error handler
app.use(errorHandler);

export default app;
