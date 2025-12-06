import { Request, Response, NextFunction } from "express";
import AppError from "../utils/appError.js";
import { logger } from "../utils/logger.js";

/**
 * Ensure types across the repo can access req.user.
 * We still keep runtime defensive checks.
 */
export interface UserRequest extends Request {
  user?: { id?: string; role?: string; email?: string };
}

export const extractUser = (
  req: UserRequest,
  _res: Response,
  next: NextFunction
) => {
  try {
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
    } else {
      req.user = undefined;
    }
    next();
  } catch (err) {
    logger.error("Failed to extract user from headers", { err });
    next(AppError.internal("Failed to extract user"));
  }
};

export const restrictTo = (...roles: string[]) => {
  return (req: UserRequest, _res: Response, next: NextFunction) => {
    if (!req.user || !req.user.role) {
      return next(AppError.unauthorized("You are not logged in"));
    }
    if (!roles.includes(req.user.role)) {
      logger.warn("Permission denied", {
        required: roles,
        role: req.user.role,
        requestId: (req as any).id,
      });
      return next(AppError.forbidden("You do not have permission"));
    }
    next();
  };
};
