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
  const provided = String(req.headers["x-gateway-key"] || "");
  const secret = String(env.GATEWAY_SECRET);

  if (!secret) {
    logger.error(
      "GATEWAY_SECRET is not configured in env - refusing requests by default"
    );
    return next(AppError.internal("Server misconfiguration"));
  }

  if (!provided || provided !== secret) {
    logger.warn("Blocked request from non-gateway source", {
      path: req.path,
      ip: req.ip,
      requestId: (req as any).id,
    });
    return next(AppError.unauthorized("Request not from API Gateway"));
  }

  // Optionally attach trust-level flag
  (req as any).isFromGateway = true;
  next();
}
