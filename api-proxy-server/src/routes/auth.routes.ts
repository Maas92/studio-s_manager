import { Router, Request, Response, NextFunction } from "express";
import { createProxy } from "../proxies/proxyFactory.js";
import { env } from "../config/env.js";
import { authLimiter } from "../middleware/rateLimiter.js";
import { protect, AuthRequest } from "../middleware/authMiddleware.js";
import NodeCache from "node-cache";
import axios from "axios";

const router = Router();

const userCache = new NodeCache({ stdTTL: 300 }); // Cache user data for 5 minutes

// Apply strict rate limiting to auth routes
router.use(authLimiter);

router.use((req: Request, res: Response, next: NextFunction) => {
  // Ensure query string is parsed
  if (typeof req.query === "undefined") {
    (req as any).query = {};
  }
  next();
});

// PUBLIC routes - no authentication required
const publicAuthProxy = createProxy({
  target: env.AUTH_SERVICE_URL,
  pathRewrite: { "^/auth": "/auth" },
});

router.post("/signup", publicAuthProxy);
router.post("/login", publicAuthProxy);
router.post("/refresh", publicAuthProxy);
router.post("/logout", publicAuthProxy);
router.post("/forgot-password", publicAuthProxy);
router.patch("/reset-password/:token", publicAuthProxy);

// PROTECTED routes - authentication required
const protectedAuthProxy = createProxy({
  target: env.AUTH_SERVICE_URL,
  pathRewrite: { "^/auth": "/auth" },
});

router.get("/me", protect, (req, res, next) => {
  protectedAuthProxy(req, res, next);
});
router.patch("/update-password", protect, protectedAuthProxy);

export default router;
