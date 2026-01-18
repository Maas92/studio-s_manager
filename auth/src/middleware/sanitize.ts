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

    // MongoDB operators
    if (key.startsWith("$")) {
      return fullPath;
    }

    // Prototype pollution
    if (key.includes(".")) {
      return fullPath;
    }

    if (key === "__proto__" || key === "constructor" || key === "prototype") {
      return fullPath;
    }

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
      // BODY
      if (req.body) {
        const dangerousKey = hasDangerousKeys(req.body, "body");
        if (dangerousKey) {
          if (logAttempts) {
            logger.warn(
              {
                ip: req.ip,
                path: req.path,
                key: dangerousKey,
                body: req.body,
              },
              "🚨 NoSQL injection attempt detected in body"
            );
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

      // PARAMS
      if (req.params) {
        const dangerousKey = hasDangerousKeys(req.params, "params");
        if (dangerousKey) {
          if (logAttempts) {
            logger.warn(
              {
                ip: req.ip,
                path: req.path,
                key: dangerousKey,
              },
              "🚨 NoSQL injection attempt detected in params"
            );
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

      // QUERY
      if (req.query) {
        const dangerousKey = hasDangerousKeys(req.query, "query");
        if (dangerousKey) {
          if (logAttempts) {
            logger.warn(
              {
                ip: req.ip,
                path: req.path,
                key: dangerousKey,
              },
              "🚨 NoSQL injection attempt detected in query"
            );
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
