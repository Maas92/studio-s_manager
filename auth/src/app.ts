import express, { Application, Request, Response, NextFunction } from "express";
import morgan from "morgan";

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      requestTime?: string;
    }
  }
}
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import mongoSanitize from "express-mongo-sanitize";
import hpp from "hpp";
import cookieParser from "cookie-parser";
import compression from "compression";
import cors from "cors";

import { initKeys, jwks } from "./utils/jwt.js";
import authRouter from "./routes/authRoutes.js";
import userRouter from "./routes/userRoutes.js";
import AppError from "./utils/appError.js";
import globalErrorHandler from "./controllers/errorController.js";

// Start express app
const app: Application = express();

app.enable("trust proxy");

// 1) GLOBAL MIDDLEWARES

await initKeys();
app.get("/.well-known/jwks.json", (_req, res) => res.json(jwks()));

// Implement CORS
app.use(cors({ origin: true, credentials: true }));

// Set security HTTP headers
app.use(helmet());

// Development logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Limit requests from same API
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: "Too many requests from this IP, please try again in an hour!",
});
app.use("/api", limiter);

// Body parser, reading data from body into req.body
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Prevent parameter pollution
app.use(
  hpp({
    whitelist: [
      "duration",
      "ratingsQuantity",
      "ratingsAverage",
      "maxGroupSize",
      "difficulty",
      "price",
    ],
  })
);

app.use(compression());

// 3) ROUTES

// Health
app.get("/health", (_req, res) => res.json({ ok: true, service: "auth" }));

app.use("/api/v1/auth", limiter, authRouter);
app.use("/api/v1/users", userRouter);

app.all("*", (req: Request, res: Response, next: NextFunction) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

export default app;
