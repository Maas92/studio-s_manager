import { Request, Response, NextFunction } from "express";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import * as jwtUtils from "../config/jwt.js";
import User from "../models/userModel.js";
import { JWTPayload } from "jose";
import logger from "../utils/logger.js";

export const protect = catchAsync(
  async (req: any, res: Response, next: NextFunction) => {
    // 1) get token from header or cookie
    const authHeader = req.get("authorization");
    const tokenFromHeader =
      authHeader && authHeader.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : undefined;
    const tokenFromCookie = req.cookies?.jwt;

    const token = tokenFromHeader || tokenFromCookie;
    if (!token) {
      logger.warn("❌ No JWT token provided");
      return next(
        AppError.unauthorized(
          "You are not logged in! Please log in to get access."
        )
      );
    }

    // 2) verify token using jwt.ts
    let verified;
    try {
      verified = await jwtUtils.verifyToken(token);
    } catch (err: any) {
      logger.warn({ err }, "❌ Invalid or expired JWT");
      return next(AppError.unauthorized("Invalid or expired token"));
    }

    const payload = verified.payload as JWTPayload;

    // payload.sub should contain user id
    const userId = payload.sub as string | undefined;
    if (!userId) {
      logger.warn("❌ JWT payload missing subject (sub)");
      return next(
        AppError.unauthorized("Token does not contain subject (sub)")
      );
    }

    // 3) ensure user still exists
    const user = await User.findById(userId).select("+role +email");
    if (!user) {
      logger.warn({ userId }, "❌ User not found for valid JWT");
      return next(
        AppError.unauthorized(
          "The user belonging to this token no longer exists."
        )
      );
    }

    // 4) attach minimal user info
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    logger.debug(
      { userId: user.id, role: user.role },
      "✅ Authenticated user attached to request"
    );

    next();
  }
);

export const restrictTo = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      logger.warn("⚠️ restrictTo called without authenticated user");
      return next(AppError.unauthorized("You are not logged in"));
    }

    if (!roles.includes(req.user.role)) {
      logger.warn(
        {
          userId: req.user.id,
          role: req.user.role,
          allowedRoles: roles,
        },
        "🚫 Unauthorized role access attempt"
      );

      return next(
        AppError.forbidden("You do not have permission to perform this action")
      );
    }

    next();
  };
};
