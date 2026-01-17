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

  // ❌ Fail fast if secret is missing (safe default)
  if (!secret) {
    logger.error(
      {
        path: req.path,
        method: req.method,
      },
      "🚨 GATEWAY_SECRET is not configured in env - refusing requests by default"
    );

    return next(
      AppError.internal("Server misconfiguration: gateway secret missing")
    );
  }

  // ✅ Allow safe public endpoints
  const whitelist = ["/health", "/healthcheck", "/"];
  if (whitelist.includes(req.path)) {
    return next();
  }

  if (!provided) {
    logger.warn(
      {
        path: req.path,
        ip: req.ip,
        requestId: (req as any).id,
      },
      "⛔ Blocked request without gateway header"
    );

    return next(AppError.unauthorized("Request not from API Gateway"));
  }

  if (provided !== secret) {
    logger.warn(
      {
        path: req.path,
        ip: req.ip,
        requestId: (req as any).id,
      },
      "⛔ Blocked request with invalid gateway header"
    );

    return next(AppError.unauthorized("Request not from API Gateway"));
  }

  // ✅ Mark request as trusted gateway traffic
  (req as any).isFromGateway = true;

  logger.debug(
    {
      path: req.path,
      requestId: (req as any).id,
    },
    "🔐 Gateway request verified"
  );

  next();
}
