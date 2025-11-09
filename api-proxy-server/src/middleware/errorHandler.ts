import { Request, Response, NextFunction } from "express";
import { UnauthorizedError } from "express-jwt";
import AppError from "../utils/appError.js";
import { logger } from "../utils/logger.js";
import { env } from "../config/env.js";

export const errorHandler = (
  err: Error | AppError | UnauthorizedError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Handle JWT errors
  if (err instanceof UnauthorizedError) {
    logger.warn("JWT Authentication failed", {
      requestId: req.requestId,
      code: err.code,
      message: err.message,
    });

    return res.status(401).json({
      status: "error",
      message: "Invalid or expired token",
      code: err.code,
      requestId: req.requestId,
    });
  }

  // Handle operational errors
  if (err instanceof AppError) {
    logger.error("Operational error", {
      message: err.message,
      statusCode: err.statusCode,
      requestId: req.requestId,
      stack: env.NODE_ENV === "development" ? err.stack : undefined,
    });

    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      requestId: req.requestId,
      ...(env.NODE_ENV === "development" && { stack: err.stack }),
    });
  }

  // Handle unknown errors
  logger.error("Unexpected error", {
    error: err.message,
    stack: err.stack,
    requestId: req.requestId,
  });

  res.status(500).json({
    status: "error",
    message:
      env.NODE_ENV === "production" ? "Something went wrong" : err.message,
    requestId: req.requestId,
    ...(env.NODE_ENV === "development" && { stack: err.stack }),
  });
};
