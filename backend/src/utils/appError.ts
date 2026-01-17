import { logger } from "./logger.js";

/**
 * AppError: central error class used across the app.
 * Always create AppError via AppError.badRequest(...), AppError.unauthorized(...), etc.
 */
class AppError extends Error {
  statusCode: number;
  status: string;
  isOperational: boolean;

  constructor(message: string, statusCode = 500) {
    super(message);

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);

    // ✅ Pino-style structured logging
    logger.error(
      {
        err: this,
        statusCode: this.statusCode,
        isOperational: this.isOperational,
      },
      "🚨 AppError created"
    );
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  static badRequest(msg = "Bad request") {
    return new AppError(msg, 400);
  }

  static unauthorized(msg = "Unauthorized") {
    return new AppError(msg, 401);
  }

  static forbidden(msg = "Forbidden") {
    return new AppError(msg, 403);
  }

  static notFound(msg = "Not found") {
    return new AppError(msg, 404);
  }

  static conflict(msg = "Conflict") {
    return new AppError(msg, 409);
  }

  static internal(msg = "Internal server error") {
    return new AppError(msg, 500);
  }

  toJSON() {
    return {
      status: this.status,
      statusCode: this.statusCode,
      message: this.message,
    };
  }
}

export default AppError;
