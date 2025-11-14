import { Request, Response, NextFunction } from "express";
import AppError from "../utils/appError";
import { logger } from "../utils/logger";
import { env } from "../config/env";

/**
 * Handle database-specific errors
 */
const handleDatabaseError = (err: any): AppError => {
  // Unique constraint violation
  if (err.code === "23505") {
    const match = err.detail?.match(/Key \((.*?)\)=\((.*?)\)/);
    const field = match ? match[1] : "field";
    const value = match ? match[2] : "value";
    const message = `Duplicate ${field}: ${value}. Please use another value.`;
    return new AppError(message, 409);
  }

  // Foreign key constraint violation
  if (err.code === "23503") {
    const message =
      "Invalid reference to related data. The referenced record does not exist.";
    return new AppError(message, 400);
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
  logger.error("ERROR 💥", {
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
  });

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
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      requestId: req.id,
    });
  } else {
    // Programming or other unknown error: don't leak error details
    logger.error("ERROR 💥", {
      error: err,
      url: req.originalUrl,
      method: req.method,
      requestId: req.id,
    });

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
  next: NextFunction
): void => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  if (env.NODE_ENV === "development") {
    sendErrorDev(err, req, res);
  } else {
    let error = { ...err };
    error.message = err.message;
    error.name = err.name;
    error.stack = err.stack;

    // Handle specific error types
    if (err.code) {
      error = handleDatabaseError(error);
    }

    // Handle JWT errors (if you add authentication later)
    if (error.name === "JsonWebTokenError") {
      error = new AppError("Invalid token. Please log in again.", 401);
    }

    if (error.name === "TokenExpiredError") {
      error = new AppError("Your token has expired. Please log in again.", 401);
    }

    // Handle validation errors
    if (error.name === "ValidationError") {
      const message = Object.values(error.errors || {})
        .map((e: any) => e.message)
        .join(". ");
      error = new AppError(message, 400);
    }

    sendErrorProd(error, req, res);
  }
};
