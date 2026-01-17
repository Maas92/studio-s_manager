import { Request, Response, NextFunction } from "express";
import AppError from "../utils/appError.js";
import { logger } from "../utils/logger.js";

/**
 * Ensure types across the repo can access req.user.
 * We still keep runtime defensive checks.
 */
export interface UserRequest extends Request {
  user?: {
    id?: string;
    role?: string;
    email?: string;
    isInternal?: boolean;
  };
}

/**
 * Extract user from either:
 * 1. Gateway-forwarded headers (x-user-id, x-user-role, x-user-email)
 * 2. Internal service headers (x-gateway-key + x-user-id)
 */
export const extractUser = (
  req: UserRequest,
  _res: Response,
  next: NextFunction
) => {
  try {
    const gatewayKey = req.headers["x-gateway-key"] as string | undefined;

    // 🔐 Internal service authentication
    if (gatewayKey && gatewayKey === process.env.GATEWAY_SECRET) {
      const internalUserId = req.headers["x-user-id"] as string | undefined;

      if (!internalUserId) {
        logger.warn(
          {
            path: req.path,
            method: req.method,
          },
          "⚠️ Internal service request missing x-user-id"
        );

        return next(
          AppError.unauthorized("User ID required for internal requests")
        );
      }

      req.user = {
        id: internalUserId,
        isInternal: true,
      };

      logger.debug(
        {
          userId: internalUserId,
        },
        "🔐 Authenticated internal service request"
      );

      return next();
    }

    // 🌐 Gateway-forwarded user headers
    const id = req.headers["x-user-id"]
      ? String(req.headers["x-user-id"])
      : undefined;
    const role = req.headers["x-user-role"]
      ? String(req.headers["x-user-role"])
      : undefined;
    const email = req.headers["x-user-email"]
      ? String(req.headers["x-user-email"])
      : undefined;

    if (id || role || email) {
      req.user = { id, role, email };

      logger.debug(
        {
          userId: id,
          role,
        },
        "👤 Extracted user from gateway headers"
      );
    } else {
      req.user = undefined;

      logger.debug(
        {
          path: req.path,
          method: req.method,
        },
        "👻 No user headers found in request"
      );
    }

    next();
  } catch (err) {
    logger.error(
      {
        err,
        path: req.path,
        method: req.method,
      },
      "💥 Failed to extract user from headers"
    );

    next(AppError.internal("Failed to extract user"));
  }
};

/**
 * Require authentication - user must be present
 */
export const requireAuth = (
  req: UserRequest,
  _res: Response,
  next: NextFunction
) => {
  if (!req.user || !req.user.id) {
    logger.warn(
      {
        path: req.path,
        method: req.method,
      },
      "🔒 Authentication required but no user found"
    );

    return next(AppError.unauthorized("You are not logged in"));
  }

  next();
};

/**
 * Restrict to specific roles
 * Note: Internal service requests bypass role checks
 */
export const restrictTo = (...roles: string[]) => {
  return (req: UserRequest, _res: Response, next: NextFunction) => {
    if (!req.user || !req.user.id) {
      return next(AppError.unauthorized("You are not logged in"));
    }

    // 🛠 Internal services bypass role checks
    if (req.user.isInternal) {
      logger.debug(
        {
          userId: req.user.id,
        },
        "🛠 Internal service bypassing role check"
      );

      return next();
    }

    if (!req.user.role) {
      return next(AppError.unauthorized("User role not found"));
    }

    if (!roles.includes(req.user.role)) {
      logger.warn(
        {
          requiredRoles: roles,
          role: req.user.role,
          userId: req.user.id,
          requestId: (req as any).id,
        },
        "⛔ Permission denied"
      );

      return next(AppError.forbidden("You do not have permission"));
    }

    next();
  };
};
