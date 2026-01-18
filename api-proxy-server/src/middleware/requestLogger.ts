import { Request, Response, NextFunction } from "express";
import logger from "../utils/logger.js";

export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;

    const logData = {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: duration,
      userAgent: req.get("user-agent"),
      ip: req.ip,
    };

    if (res.statusCode >= 400) {
      logger.warn(logData, "⚠️ HTTP request completed with error");
    } else {
      logger.info(logData, "✅ HTTP request completed");
    }
  });

  next();
};
