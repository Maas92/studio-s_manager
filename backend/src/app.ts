import express, { Application, Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import AppError from "./utils/appError.js";
import globalErrorHandler from "./controllers/errorController.js";
import { extractUser } from "./middleware/userMiddleware.js";
import api from "./routes/index.js";
import { requestId } from "./middleware/requestId.js";
import { httpLogger } from "./utils/logger.js";
import verifyGateway from "./middleware/verifyGateway.js";
import { metricsMiddleware, metricsEndpoint } from "./middleware/metrics.js";

const app: Application = express();

// 1) GLOBAL MIDDLEWARES
app.use(helmet());

app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// CORS
const isDev = process.env.NODE_ENV !== "production";

const corsOptions = {
  origin: isDev
    ? [/^http:\/\/localhost:\d+$/] // Allow any localhost port in dev
    : process.env.FRONTEND_URL, // In prod, allow the deployed frontend URL
  credentials: true,
};

app.use(cors(corsOptions));

app.use(requestId);

// Apply gateway check as broadly as possible (protect service)
app.use(verifyGateway);

app.use(httpLogger);

// Extract user info from headers (set by API Gateway)
app.use(extractUser);

// 2) ROUTES
// Health check
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "healthy", service: "inventory-service" });
});

app.use("", api);

// Handle undefined routes
app.all(/.*/, (req: Request, res: Response, next: NextFunction) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Use metrics middleware
app.use(metricsMiddleware);
app.get("/metrics", metricsEndpoint);

// Global error handler
app.use(globalErrorHandler);

export default app;
