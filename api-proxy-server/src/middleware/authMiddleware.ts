import { Request, Response, NextFunction } from "express";
import { jwtVerify, createRemoteJWKSet } from "jose";
import AppError from "../utils/appError.js";
import catchAsync from "../utils/catchAsync.js";
import { env } from "../config/env.js";

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

// Create JWKS fetcher for verifying RSA signatures
const JWKS = createRemoteJWKSet(new URL(env.JWKS_URL));

export const protect = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    console.log("\n🔒 PROTECT MIDDLEWARE");

    // 1) Get token from header or cookie
    let token: string | undefined;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
      console.log("✅ Token from Authorization header");
    } else if (req.cookies.jwt) {
      token = req.cookies.jwt;
      console.log("✅ Token from jwt cookie");
    }

    if (!token) {
      console.log("❌ No token found");
      return next(
        new AppError("You are not logged in! Please log in to get access.", 401)
      );
    }

    // 2) Verify token using RSA public key from JWKS
    let decoded: JwtPayload;
    try {
      console.log("🔍 Verifying token with JWKS...");
      const { payload } = await jwtVerify(token, JWKS, {
        issuer: env.JWT_ISSUER,
        audience: env.JWT_AUDIENCE,
      });

      decoded = payload as unknown as JwtPayload;
      console.log("✅ Token verified successfully");
      console.log("User:", decoded.sub, decoded.email, decoded.role);
    } catch (err: any) {
      console.log("❌ Token verification failed:", err.message);
      if (err.code === "ERR_JWT_EXPIRED") {
        return next(
          new AppError("Your token has expired! Please log in again.", 401)
        );
      }
      return next(new AppError("Invalid token. Please log in again!", 401));
    }

    // 3) Attach user to request
    req.user = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role,
    };

    console.log("✅ User attached to request\n");
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
