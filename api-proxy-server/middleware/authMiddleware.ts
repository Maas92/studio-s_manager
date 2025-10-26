import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { promisify } from "util";
import AppError from "../utils/appError";
import catchAsync from "../utils/catchAsync";

interface JwtPayload {
  id: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  iat: number;
  exp: number;
}

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    firstName: string;
    lastName: string;
  };
}

export const protect = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    // 1) Get token from header or cookie
    let token: string | undefined;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies.jwt) {
      token = req.cookies.jwt;
    }

    if (!token) {
      return next(
        new AppError("You are not logged in! Please log in to get access.", 401)
      );
    }

    // 2) Verify token
    let decoded: JwtPayload;
    try {
      const verify = promisify(jwt.verify) as unknown as (
        token: string,
        secret: string
      ) => Promise<JwtPayload>;
      decoded = await verify(token, process.env.JWT_SECRET!);
    } catch (err: any) {
      if (err.name === "JsonWebTokenError") {
        return next(new AppError("Invalid token. Please log in again!", 401));
      }
      if (err.name === "TokenExpiredError") {
        return next(
          new AppError("Your token has expired! Please log in again.", 401)
        );
      }
      return next(err);
    }

    // 3) Attach user to request
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      firstName: decoded.firstName,
      lastName: decoded.lastName,
    };

    next();
  }
);

export const restrictTo = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(
        new AppError("You do not have permission to perform this action", 403)
      );
    }
    next();
  };
};
