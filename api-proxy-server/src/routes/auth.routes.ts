import { Router } from "express";
import { createProxy } from "../proxies/proxyFactory.js";
import { env } from "../config/env.js";
import { authLimiter } from "../middleware/rateLimiter.js";
import { protect } from "../middleware/authMiddleware.js";

const router = Router();

// Apply strict rate limiting to auth routes
router.use(authLimiter);

// PUBLIC routes - no authentication required
const publicAuthProxy = createProxy({
  target: env.AUTH_SERVICE_URL,
  pathRewrite: { "^/auth": "" },
});

// PROTECTED routes - authentication required
const protectedAuthProxy = createProxy({
  target: env.AUTH_SERVICE_URL,
  pathRewrite: { "^/auth": "" },
});

// --- PUBLIC routes ---
router.post("/signup", publicAuthProxy);
router.post("/login", publicAuthProxy);
router.post("/refresh", publicAuthProxy);
router.post("/logout", publicAuthProxy);
router.post("/forgot-password", publicAuthProxy);
router.patch("/reset-password/:token", publicAuthProxy);

// --- PROTECTED routes ---
router.get("/me", protect, protectedAuthProxy);
router.patch("/update-password", protect, protectedAuthProxy);

export default router;
