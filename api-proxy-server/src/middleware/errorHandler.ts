import { Request, Response, NextFunction } from "express";
import { UnauthorizedError } from "express-jwt";
import AppError from "../utils/appError.js";
import { logger } from "../utils/logger.js";
import { env } from "../config/env.js";

export const errorHandler = (
  err: Error | AppError | UnauthorizedError,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  const requestId = req.requestId;

  // 🔐 JWT authentication errors
  if (err instanceof UnauthorizedError) {
    logger.warn(
      {
        err,
        requestId,
        code: err.code,
      },
      "🔐 JWT authentication failed"
    );

    return res.status(401).json({
      status: "error",
      message: "Invalid or expired token",
      code: err.code,
      requestId,
    });
  }

  // ⚙️ Operational (expected) application errors
  if (err instanceof AppError) {
    logger.error(
      {
        err,
        requestId,
        statusCode: err.statusCode,
        isOperational: true,
      },
      "⚙️ Operational application error"
    );

    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      requestId,
      ...(env.NODE_ENV === "development" && { stack: err.stack }),
    });
  }

  // 💥 Unknown / programming errors
  logger.fatal(
    {
      err,
      requestId,
      isOperational: false,
    },
    "💥 Unexpected application error"
  );

  res.status(500).json({
    status: "error",
    message:
      env.NODE_ENV === "production" ? "Something went wrong" : err.message,
    requestId,
    ...(env.NODE_ENV === "development" && { stack: err.stack }),
  });
};
