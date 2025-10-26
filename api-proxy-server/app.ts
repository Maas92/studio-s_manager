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
import AppError from "./utils/appError";
import globalErrorHandler from "./controllers/errorController";
import { protect } from "./middleware/authMiddleware";

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

// 2) ROUTES

// Health check
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({
    status: "healthy",
    service: "api-gateway",
    timestamp: new Date().toISOString(),
  });
});

// Auth routes - proxy to auth-service (MongoDB)
const authProxyOptions: Options = {
  target: process.env.AUTH_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: {
    "^/api/v1/auth": "/api/v1/auth",
  },
  on: {
    error: (err, req, res) => {
      console.error("Auth Service Proxy Error:", err);
      const response = res as Response;
      response.status(503).json({
        status: "error",
        message: "Auth service is currently unavailable",
      });
    },
  },
};

app.use("/api/v1/auth", createProxyMiddleware(authProxyOptions));

// Users routes - proxy to auth-service (MongoDB) with user info
const usersProxyOptions: Options = {
  target: process.env.AUTH_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: {
    "^/api/v1/users": "/api/v1/users",
  },
  on: {
    proxyReq: (proxyReq, req: any) => {
      if (req.user) {
        proxyReq.setHeader("X-User-Id", req.user.id);
        proxyReq.setHeader("X-User-Role", req.user.role);
        proxyReq.setHeader("X-User-Email", req.user.email);
      }
    },
    error: (err, req, res) => {
      console.error("Auth Service Proxy Error:", err);
      const response = res as Response;
      response.status(503).json({
        status: "error",
        message: "User service is currently unavailable",
      });
    },
  },
};

app.use("/api/v1/users", protect, createProxyMiddleware(usersProxyOptions));

// Protected routes - All other routes require authentication
app.use("/api/v1/*", protect);

// Products routes - proxy to inventory-service (PostgreSQL)
const productsProxyOptions: Options = {
  target: process.env.INVENTORY_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: {
    "^/api/v1/products": "/api/v1/products",
  },
  on: {
    proxyReq: (proxyReq, req: any) => {
      if (req.user) {
        proxyReq.setHeader("X-User-Id", req.user.id);
        proxyReq.setHeader("X-User-Role", req.user.role);
      }
    },
    error: (err, req, res) => {
      console.error("Inventory Service Proxy Error:", err);
      const response = res as Response;
      response.status(503).json({
        status: "error",
        message: "Inventory service is currently unavailable",
      });
    },
  },
};

app.use("/api/v1/products", createProxyMiddleware(productsProxyOptions));

// Inventory routes
const inventoryProxyOptions: Options = {
  target: process.env.INVENTORY_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: {
    "^/api/v1/inventory": "/api/v1/inventory",
  },
  on: {
    proxyReq: (proxyReq, req: any) => {
      if (req.user) {
        proxyReq.setHeader("X-User-Id", req.user.id);
        proxyReq.setHeader("X-User-Role", req.user.role);
      }
    },
  },
};

app.use("/api/v1/inventory", createProxyMiddleware(inventoryProxyOptions));

// Categories routes
const categoriesProxyOptions: Options = {
  target: process.env.INVENTORY_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: {
    "^/api/v1/categories": "/api/v1/categories",
  },
  on: {
    proxyReq: (proxyReq, req: any) => {
      if (req.user) {
        proxyReq.setHeader("X-User-Id", req.user.id);
        proxyReq.setHeader("X-User-Role", req.user.role);
      }
    },
  },
};

app.use("/api/v1/categories", createProxyMiddleware(categoriesProxyOptions));

// Suppliers routes
const suppliersProxyOptions: Options = {
  target: process.env.INVENTORY_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: {
    "^/api/v1/suppliers": "/api/v1/suppliers",
  },
  on: {
    proxyReq: (proxyReq, req: any) => {
      if (req.user) {
        proxyReq.setHeader("X-User-Id", req.user.id);
        proxyReq.setHeader("X-User-Role", req.user.role);
      }
    },
  },
};

app.use("/api/v1/suppliers", createProxyMiddleware(suppliersProxyOptions));

// Locations routes
const locationsProxyOptions: Options = {
  target: process.env.INVENTORY_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: {
    "^/api/v1/locations": "/api/v1/locations",
  },
  on: {
    proxyReq: (proxyReq, req: any) => {
      if (req.user) {
        proxyReq.setHeader("X-User-Id", req.user.id);
        proxyReq.setHeader("X-User-Role", req.user.role);
      }
    },
  },
};

app.use("/api/v1/locations", createProxyMiddleware(locationsProxyOptions));

// Handle undefined routes
app.all("*", (req: Request, res: Response, next: NextFunction) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global error handler
app.use(globalErrorHandler);

export default app;
