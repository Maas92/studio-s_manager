import express, { Application, Request, Response, NextFunction } from "express";
import morgan from "morgan";
import helmet from "helmet";
import cors from "cors";
import AppError from "./utils/appError.js";
import globalErrorHandler from "./controllers/errorController.js";
import { extractUser } from "./middleware/userMiddleware.js";
import api from "./routes/index.js";
import { requestId } from "./middleware/requestId.js";
import verifyGateway from "./middleware/verifyGateway.js";

const app: Application = express();

// 1) GLOBAL MIDDLEWARES
app.use(helmet());

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// CORS
app.use(cors({ origin: [/^http:\/\/localhost:\d+$/], credentials: true }));

app.use(requestId);

// Apply gateway check as broadly as possible (protect service)
app.use(verifyGateway);

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

// Global error handler
app.use(globalErrorHandler);

export default app;
