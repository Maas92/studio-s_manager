import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../config/jwt.js";
import User, { IUser } from "../models/userModel.js";
import AppError from "../utils/appError.js";
import catchAsync from "../utils/catchAsync.js";
import { logger } from "../utils/logger.js";

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
      requestTime?: string;
    }
  }
}

export const protect = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    // 1) Get token from header
    let token: string | undefined;
    if (req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies?.jwt) {
      token = req.cookies.jwt;
    }

    if (!token) {
      throw AppError.unauthorized(
        "You are not logged in. Please log in to access this resource"
      );
    }

    // 2) Verify token
    let payload;
    try {
      const result = await verifyToken(token);
      payload = result.payload;
    } catch (error: any) {
      if (error.code === "ERR_JWT_EXPIRED") {
        throw AppError.unauthorized(
          "Your token has expired. Please log in again"
        );
      }
      throw AppError.unauthorized("Invalid token. Please log in again");
    }

    // 3) Check if user still exists
    const userId = payload.sub as string;
    const currentUser = await User.findById(userId);

    if (!currentUser) {
      throw AppError.unauthorized(
        "The user belonging to this token no longer exists"
      );
    }

    // 4) Check if user is active
    if (!currentUser.active) {
      throw AppError.unauthorized("Your account has been deactivated");
    }

    // 5) Check if user changed password after token was issued
    if (currentUser.passwordChangedAt) {
      const iat = typeof payload.iat === "number" ? payload.iat : 0;
      const changedTimestamp = Math.floor(
        currentUser.passwordChangedAt.getTime() / 1000
      );

      if (iat < changedTimestamp) {
        throw AppError.unauthorized(
          "User recently changed password. Please log in again"
        );
      }
    }

    // 6) Grant access to protected route
    req.user = currentUser;
    next();
  }
);

export const restrictTo = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(AppError.unauthorized("You are not logged in"));
    }

    if (!roles.includes(req.user.role)) {
      logger.warn(
        `Unauthorized access attempt by user ${req.user.id} with role ${req.user.role}`
      );
      return next(
        AppError.forbidden("You do not have permission to perform this action")
      );
    }

    next();
  };
};
