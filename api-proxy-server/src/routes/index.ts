import { Application } from "express";
import { checkJwt } from "../config/jwt.js";
import { apiLimiter } from "../middleware/rateLimiter.js";
import healthRoutes from "./health.js";
import authRoutes from "./auth.routes.js";
import apiRoutes from "./api.routes.js";
import { mapAuthToUser } from "../middleware/mapAuthToUser.js";
import { createProxy } from "../proxies/proxyFactory.js";
import { env } from "../config/env.js";

export const setupRoutes = (app: Application) => {
  // Health checks (no auth, no rate limit)
  app.use("/health", healthRoutes);

  // Auth routes (rate limited, no JWT)
  app.use("/auth", authRoutes);

  // Google OAuth callback (PUBLIC - no JWT required)
  // This is called by Google redirect from user's browser
  app.get(
    "/google-contacts/callback",
    createProxy({
      target: env.GOOGLE_CONTACTS_SERVICE_URL,
      isBackendService: false, // No gateway key for public callback
    })
  );

  // Protected API routes (JWT required)
  app.use("/", apiLimiter, checkJwt, mapAuthToUser, apiRoutes);
};
