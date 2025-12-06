import { Request, Response, NextFunction } from "express";
import AppError from "../utils/appError.js";
import { logger } from "../utils/logger.js";
import { env } from "../config/env.js";

/**
 * Ensure requests to backend come from the API Gateway.
 * The gateway must include a shared secret header X-Gateway-Key.
 */
export default function verifyGateway(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  // Do not coerce to String — allow undefined detection
  const provided =
    (req.headers["x-gateway-key"] as string | undefined) || undefined;
  const secret = env.GATEWAY_SECRET || undefined;

  // If secret isn't configured, fail fast and loudly (safe default)
  if (!secret) {
    logger.error(
      "GATEWAY_SECRET is not configured in env - refusing requests by default"
    );
    return next(
      AppError.internal("Server misconfiguration: gateway secret missing")
    );
  }

  // Allow some safe public endpoints (whitelist)
  const whitelist = ["/health", "/healthcheck", "/"];
  if (whitelist.includes(req.path)) {
    return next();
  }

  if (!provided) {
    logger.warn("Blocked request without gateway header", {
      path: req.path,
      ip: req.ip,
      requestId: (req as any).id,
    });
    return next(AppError.unauthorized("Request not from API Gateway"));
  }

  if (provided !== secret) {
    logger.warn("Blocked request with invalid gateway header", {
      path: req.path,
      ip: req.ip,
      requestId: (req as any).id,
    });
    return next(AppError.unauthorized("Request not from API Gateway"));
  }

  (req as any).isFromGateway = true;
  next();
}
