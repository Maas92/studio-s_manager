import { Application } from "express";
import { checkJwt } from "../config/jwt.js";
import { apiLimiter } from "../middleware/rateLimiter.js";
import healthRoutes from "./health.js";
import authRoutes from "./auth.routes.js";
import apiRoutes from "./api.routes.js";

export const setupRoutes = (app: Application) => {
  // Health checks (no auth, no rate limit)
  app.use("/health", healthRoutes);

  // Auth routes (rate limited, no JWT)
  app.use("/auth", authRoutes);

  // Protected API routes (JWT required)
  app.use("/api/v1", apiLimiter, checkJwt, apiRoutes);
};
