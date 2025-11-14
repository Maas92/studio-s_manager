import { Router, Request, Response, NextFunction } from "express";
import { createProxy } from "../proxies/proxyFactory.js";
import { env } from "../config/env.js";
import { authLimiter } from "../middleware/rateLimiter.js";

const router = Router();

// Apply strict rate limiting to auth routes
router.use(authLimiter);

router.use((req: Request, res: Response, next: NextFunction) => {
  // Ensure query string is parsed
  if (typeof req.query === "undefined") {
    (req as any).query = {};
  }
  next();
});

// Proxy all auth routes to auth service
router.use(
  "/",
  createProxy({
    target: env.AUTH_SERVICE_URL,
    pathRewrite: { "^/auth": "auth" },
  })
);

export default router;
