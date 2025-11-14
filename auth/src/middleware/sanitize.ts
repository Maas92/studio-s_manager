import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger.js";
import AppError from "../utils/appError.js";

/**
 * Enhanced MongoDB sanitization middleware for Express 5.x
 * Detects and blocks NoSQL injection attempts
 */

const hasDangerousKeys = (obj: any, path: string = ""): string | null => {
  if (!obj || typeof obj !== "object") {
    return null;
  }

  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      const result = hasDangerousKeys(obj[i], `${path}[${i}]`);
      if (result) return result;
    }
    return null;
  }

  for (const key in obj) {
    const fullPath = path ? `${path}.${key}` : key;

    // Check for MongoDB operators
    if (key.startsWith("$")) {
      return fullPath;
    }

    // Check for dots in keys (prototype pollution)
    if (key.includes(".")) {
      return fullPath;
    }

    // Check for __proto__ or constructor
    if (key === "__proto__" || key === "constructor" || key === "prototype") {
      return fullPath;
    }

    // Recursively check nested objects
    const result = hasDangerousKeys(obj[key], fullPath);
    if (result) return result;
  }

  return null;
};

export const mongoSanitize = (
  options: {
    onSanitize?: "remove" | "error";
    logAttempts?: boolean;
  } = {}
) => {
  const { onSanitize = "error", logAttempts = true } = options;

  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      // Check body
      if (req.body) {
        const dangerousKey = hasDangerousKeys(req.body, "body");
        if (dangerousKey) {
          if (logAttempts) {
            logger.warn("NoSQL injection attempt detected", {
              ip: req.ip,
              path: req.path,
              key: dangerousKey,
              body: req.body,
            });
          }

          if (onSanitize === "error") {
            return next(
              AppError.badRequest(
                `Invalid request: dangerous key detected (${dangerousKey})`
              )
            );
          }
        }
      }

      // Check params
      if (req.params) {
        const dangerousKey = hasDangerousKeys(req.params, "params");
        if (dangerousKey) {
          if (logAttempts) {
            logger.warn("NoSQL injection attempt in params", {
              ip: req.ip,
              path: req.path,
              key: dangerousKey,
            });
          }

          if (onSanitize === "error") {
            return next(
              AppError.badRequest(
                `Invalid request: dangerous parameter (${dangerousKey})`
              )
            );
          }
        }
      }

      // Check query
      if (req.query) {
        const dangerousKey = hasDangerousKeys(req.query, "query");
        if (dangerousKey) {
          if (logAttempts) {
            logger.warn("NoSQL injection attempt in query", {
              ip: req.ip,
              path: req.path,
              key: dangerousKey,
            });
          }

          if (onSanitize === "error") {
            return next(
              AppError.badRequest(
                `Invalid request: dangerous query parameter (${dangerousKey})`
              )
            );
          }
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
