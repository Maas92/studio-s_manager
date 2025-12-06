import express, { Application, Request, Response, NextFunction } from "express";
import morgan from "morgan";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { corsOptions } from "./config/cors.js";
import AppError from "./utils/appError.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { setupRoutes } from "./routes/index.js";
import { requestId } from "./middleware/requestId.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { env } from "./config/env.js";
import { queryParser } from "./middleware/queryParser.js";
import bodyParser from "body-parser";

const app: Application = express();

// Trust proxy
app.set("trust proxy", 1);

// Cookie parser
app.use(cookieParser());

// middleware: if Authorization header missing, try jwt cookie
app.use((req, _res, next) => {
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
  })
);

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

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
  })
);

// Request ID for correlation
app.use(requestId);
if (env.NODE_ENV !== "test") {
  app.use(requestLogger);
}

app.use(queryParser);

// Setup routes
setupRoutes(app);

// 404 handler for undefined routes
app.all(/.*/, (req: Request, res: Response, next: NextFunction) => {
  next(new AppError(`Cannot find ${req.originalUrl} on this server`, 404));
});

// Global error handler
app.use(errorHandler);

export default app;
