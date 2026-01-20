import express, { Application, Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { corsOptions } from "./config/cors.js";
import AppError from "./utils/appError.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { setupRoutes } from "./routes/index.js";
import { requestId } from "./middleware/requestId.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { httpLogger } from "./utils/logger.js";
import { env } from "./config/env.js";
import { queryParser } from "./middleware/queryParser.js";
import bodyParser from "body-parser";
import { metricsMiddleware, metricsEndpoint } from "./middleware/metrics.js";

const app: Application = express();

// Trust proxy
app.set("trust proxy", 1);

// Cookie parser
app.use(cookieParser());

// Whitelist public endpoints that don't need JWT
const publicPaths = ["/health", "/healthcheck", "/metrics"];

// middleware: if Authorization header missing, try jwt cookie
app.use((req, _res, next) => {
  if (publicPaths.includes(req.path)) {
    return next();
  }

  const authHeader = req.get("authorization") || req.headers.authorization;
  if (!authHeader) {
    // cookie-parser populates req.cookies
    const jwtFromCookie = (req as any).cookies?.jwt;
    if (jwtFromCookie) {
      // populate header so downstream auth middleware can use it
      req.headers.authorization = `Bearer ${jwtFromCookie}`;
    }
  }
  next();
});

// Disable x-powered-by header
app.disable("x-powered-by");

// 1) GLOBAL MIDDLEWARES
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

// CORS
app.use(cors(corsOptions));

// Handle preflight requests explicitly
// app.options("*", cors(corsOptions));

// Conditional body parser - parse JSON for backend routes that need it
// Skip parsing for auth routes (they're proxied directly)
// app.use((req, res, next) => {
//   // Don't parse body for direct proxy routes (auth service)
//   if (req.path.startsWith("/auth") || req.path.startsWith("/users")) {
//     return next();
//   }
//   // Parse body for backend service routes
//   return express.json({ limit: "10kb" })(req, res, next);
// });

app.use(
  express.urlencoded({
    extended: true,
    limit: "10kb",
    parameterLimit: 1000,
  }),
);

// Request ID for correlation
app.use(requestId);
if (env.NODE_ENV !== "test") {
  app.use(requestLogger);
}

app.use(queryParser);

app.use(httpLogger);

// Use metrics middleware
app.use(metricsMiddleware);
app.get("/metrics", metricsEndpoint);

// Setup routes
setupRoutes(app);

// 404 handler for undefined routes
app.all(/.*/, (req: Request, res: Response, next: NextFunction) => {
  next(new AppError(`Cannot find ${req.originalUrl} on this server`, 404));
});

// Global error handler
app.use(errorHandler);

export default app;
