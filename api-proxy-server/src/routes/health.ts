import { Router, Request, Response } from "express";
import axios from "axios";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import catchAsync from "../utils/catchAsync.js";

const router = Router();

interface HealthStatus {
  status: "ok" | "degraded" | "down";
  timestamp: string;
  uptime: number;
  services: {
    gateway: "ok" | "down";
    auth: "ok" | "down" | "unknown";
    inventory: "ok" | "down" | "unknown";
  };
}

const checkService = async (url: string, timeout = 2000): Promise<boolean> => {
  try {
    const response = await axios.get(`${url}/health`, {
      timeout,
      validateStatus: (status) => status === 200,
    });
    return response.data?.ok === true || response.status === 200;
  } catch {
    return false;
  }
};

router.get(
  "/",
  catchAsync(async (_req: Request, res: Response) => {
    const [authHealthy, inventoryHealthy] = await Promise.all([
      checkService(env.AUTH_SERVICE_URL),
      checkService(env.INVENTORY_SERVICE_URL),
    ]);

    const health: HealthStatus = {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        gateway: "ok",
        auth: authHealthy ? "ok" : "down",
        inventory: inventoryHealthy ? "ok" : "down",
      },
    };

    if (!authHealthy || !inventoryHealthy) {
      health.status = "degraded";
    }

    const statusCode = health.status === "ok" ? 200 : 503;

    logger.info(
      {
        status: health.status,
        services: health.services,
        uptime: health.uptime,
      },
      "💓 Health check performed"
    );

    res.status(statusCode).json(health);
  })
);

// Liveness probe (always returns 200 if server is running)
router.get("/live", (_req: Request, res: Response) => {
  logger.debug("🫀 Liveness probe OK");
  res.status(200).json({ status: "alive" });
});

// Readiness probe (checks if ready to accept traffic)
router.get(
  "/ready",
  catchAsync(async (_req: Request, res: Response) => {
    const authHealthy = await checkService(env.AUTH_SERVICE_URL, 1000);

    if (authHealthy) {
      logger.info("✅ Readiness probe OK");
      res.status(200).json({ status: "ready" });
    } else {
      logger.warn("⚠️ Readiness probe failed");
      res.status(503).json({ status: "not ready" });
    }
  })
);

export default router;
