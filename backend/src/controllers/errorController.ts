import { Request, Response, NextFunction } from "express";
import AppError from "../utils/appError.js";
import { logger } from "../utils/logger.js";
import { env } from "../config/env.js";

/**
 * Handle database-specific errors
 */
const handleDatabaseError = (err: any): AppError => {
  // Unique constraint violation
  if (err.code === "23505") {
    const match = err.detail?.match(/Key \((.*?)\)=\((.*?)\)/);
    const field = match ? match[1] : "field";
    const value = match ? match[2] : "value";
    return new AppError(
      `Duplicate ${field}: ${value}. Please use another value.`,
      409
    );
  }

  // Foreign key constraint violation
  if (err.code === "23503") {
    return new AppError(
      "Invalid reference to related data. The referenced record does not exist.",
      400
    );
  }

  // Invalid input syntax
  if (err.code === "22P02") {
    return new AppError("Invalid input data type provided", 400);
  }

  // Not null constraint violation
  if (err.code === "23502") {
    const column = err.column || "field";
    return new AppError(`Missing required field: ${column}`, 400);
  }

  // Check constraint violation
  if (err.code === "23514") {
    return new AppError("Data validation failed", 400);
  }

  return new AppError("Database operation failed", 500);
};

/**
 * Send detailed error in development
 */
const sendErrorDev = (err: AppError, req: Request, res: Response): void => {
  logger.error(
    {
      status: err.status,
      statusCode: err.statusCode,
      message: err.message,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
      requestId: req.id,
      error: err,
    },
    "💥 Application error (development)"
  );

  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
    requestId: req.id,
  });
};

/**
 * Send limited error in production
 */
const sendErrorProd = (err: AppError, req: Request, res: Response): void => {
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      requestId: req.id,
    });
  } else {
    logger.error(
      {
        url: req.originalUrl,
        method: req.method,
        requestId: req.id,
        error: err,
      },
      "💥 Unhandled application error"
    );

    res.status(500).json({
      status: "error",
      message: "Something went wrong. Please try again later.",
      requestId: req.id,
    });
  }
};

/**
 * Global error handling middleware
 */
export default (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  if (env.NODE_ENV === "development") {
    sendErrorDev(err, req, res);
  } else {
    let error: any = {
      ...err,
      message: err.message,
      name: err.name,
      stack: err.stack,
    };

    // Database errors
    if (err.code) {
      error = handleDatabaseError(error);
    }

    // JWT errors
    if (error.name === "JsonWebTokenError") {
      error = new AppError("Invalid token. Please log in again.", 401);
    }

    if (error.name === "TokenExpiredError") {
      error = new AppError("Your token has expired. Please log in again.", 401);
    }

    // Validation errors
    if (error.name === "ValidationError") {
      const message = Object.values(error.errors || {})
        .map((e: any) => e.message)
        .join(". ");
      error = new AppError(message, 400);
    }

    sendErrorProd(error, req, res);
  }
};
