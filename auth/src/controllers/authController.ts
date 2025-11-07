// apps/auth/src/controllers/authController.ts
import { Request, Response, NextFunction } from "express";
import argon2 from "argon2";
import { jwtVerify } from "jose";
import User, { IUser } from "../models/userModel.js"; // <-- adjust import path/name if yours differs
import AppError from "../utils/appError.js";
import catchAsync from "../utils/catchAsync.js";
import { signAccess, signRefresh, verifyAccess } from "../utils/jwt.js";

// -----------------------------------------------------------------------------
// Config
// -----------------------------------------------------------------------------
const ACCESS_TTL_SEC = Number(process.env.ACCESS_TOKEN_TTL_SEC ?? 900); // 15m
const REFRESH_TTL_SEC = Number(process.env.REFRESH_TOKEN_TTL_SEC ?? 1209600); // 14d
const ISSUER = process.env.JWT_ISSUER ?? "studio-s-auth";
const AUDIENCE = process.env.JWT_AUDIENCE ?? "studio-s-clients";

// When verifying refresh on /refresh, we can verify with our own JWKS URL.
// Set SELF_JWKS_URL to http://auth:5002/.well-known/jwks.json (docker) or your local URL.
const SELF_JWKS_URL =
  process.env.SELF_JWKS_URL || "http://localhost:5002/.well-known/jwks.json";

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------
function setRefreshCookie(res: Response, token: string) {
  res.cookie("refresh_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: REFRESH_TTL_SEC * 1000,
    // If you use a custom domain in prod: domain: ".yourdomain.com"
  });
}

function sanitizeUser(u: IUser) {
  return {
    id: u.id,
    email: u.email,
    role: (u as any).role,
    name: (u as any).name ?? undefined,
    firstName: (u as any).firstName ?? undefined,
    lastName: (u as any).lastName ?? undefined,
    createdAt: (u as any).createdAt,
    updatedAt: (u as any).updatedAt,
  };
}

async function issueTokens(user: IUser, res: Response) {
  const payload = {
    sub: String(user._id),
    email: user.email,
    role: (user as any).role,
  };
  const [access, refresh] = await Promise.all([
    signAccess(payload),
    signRefresh(payload),
  ]);
  setRefreshCookie(res, refresh);
  return { access, user: sanitizeUser(user) };
}

// -----------------------------------------------------------------------------
// Controllers
// -----------------------------------------------------------------------------

/**
 * POST /api/v1/auth/signup
 * Body: { email, password, name?, role? }
 */
export const signup = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { email, password, name, role } = req.body ?? {};
    if (!email || !password)
      return next(new AppError("Email and password are required", 400));

    const exists = await User.findOne({ email });
    if (exists) return next(new AppError("Email already in use", 409));

    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    const user = await User.create({ email, passwordHash, name, role });
    const { access, user: safe } = await issueTokens(user, res);

    res.status(201).json({
      status: "success",
      access_token: access,
      user: safe,
      expires_in: ACCESS_TTL_SEC,
    });
  }
);

/**
 * POST /api/v1/auth/login
 * Body: { email, password }
 */
export const login = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { email, password } = req.body ?? {};
    if (!email || !password)
      return next(new AppError("Email and password are required", 400));

    // Select passwordHash to verify
    const user = await User.findOne({ email }).select("+passwordHash");
    if (!user) return next(new AppError("Invalid credentials", 401));

    const ok = await argon2.verify(user.password, password);
    if (!ok) return next(new AppError("Invalid credentials", 401));

    const { access, user: safe } = await issueTokens(user, res);
    res.status(200).json({
      status: "success",
      access_token: access,
      user: safe,
      expires_in: ACCESS_TTL_SEC,
    });
  }
);

/**
 * POST /api/v1/auth/refresh
 * Cookie: refresh_token (HttpOnly)
 *
 * Note: This version verifies the refresh JWT via your own JWKS endpoint.
 * (You can extend to implement rotation + session storage later.)
 */
export const refresh = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const token =
      (req.signedCookies && req.signedCookies.refresh_token) ||
      req.cookies?.refresh_token;
    if (!token) return next(new AppError("Missing refresh token", 401));

    // Verify signature & claims (RS256 via JWKS)
    const { createRemoteJWKSet } = await import("jose");
    const JWKS = createRemoteJWKSet(new URL(SELF_JWKS_URL));
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: ISSUER,
      audience: AUDIENCE,
    }).catch(() => ({ payload: null as any }));

    if (!payload?.sub || !payload?.email) {
      return next(new AppError("Invalid refresh token", 401));
    }

    // Mint new access (no rotation here; add rotation + session store later)
    const newAccess = await signAccess({
      sub: payload.sub,
      email: String(payload.email),
      role: (payload as any).role,
    });
    res
      .status(200)
      .json({ access_token: newAccess, expires_in: ACCESS_TTL_SEC });
  }
);

/**
 * POST /api/v1/auth/logout
 * Clears the refresh cookie (and later, revoke session when you add rotation).
 */
export const logout = (_req: Request, res: Response) => {
  res.clearCookie("refresh_token");
  res.status(200).json({ status: "success" });
};

/**
 * GET /api/v1/auth/me
 * Requires Bearer access token (gateway typically enforces; this is handy if called directly).
 */
export const me = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const header = req.headers.authorization ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return next(new AppError("Missing access token", 401));

    const { payload } = await verifyAccess(token).catch(() => ({
      payload: null as any,
    }));
    if (!payload?.sub) return next(new AppError("Invalid access token", 401));

    const user = await User.findById(payload.sub);
    if (!user) return next(new AppError("User no longer exists", 404));

    res.status(200).json({ user: sanitizeUser(user) });
  }
);

/**
 * Middleware: protect (for routes you keep directly in the auth service)
 * Parses Authorization: Bearer <access> and verifies RS256 claims locally.
 * Note: In production, prefer to protect your domain services behind the API Gateway instead.
 */
export const protect = catchAsync(
  async (
    req: Request & { user?: IUser },
    _res: Response,
    next: NextFunction
  ) => {
    const header = req.headers.authorization ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return next(new AppError("You are not logged in", 401));

    const { payload }: any = await verifyAccess(token).catch(() => ({
      payload: null,
    }));
    if (!payload?.sub) return next(new AppError("Invalid token", 401));

    const currentUser = await User.findById(payload.sub);
    if (!currentUser)
      return next(new AppError("The user no longer exists", 401));

    // If you use passwordChangedAt on the model, enforce token invalidation after password changes:
    const iat = typeof payload.iat === "number" ? payload.iat : 0;
    const changedAt = (currentUser as any).passwordChangedAt as
      | Date
      | undefined;
    if (changedAt) {
      const changedTs = Math.floor(changedAt.getTime() / 1000);
      if (iat < changedTs)
        return next(
          new AppError("Password changed recently. Please log in again.", 401)
        );
    }

    (req as any).user = currentUser;
    next();
  }
);

/**
 * Authorization helper: restrictTo('owner','manager',...)
 */
export const restrictTo = (...roles: string[]) => {
  return (
    req: Request & { user?: IUser },
    _res: Response,
    next: NextFunction
  ) => {
    const role = (req.user as any)?.role;
    if (!role || !roles.includes(role)) {
      return next(
        new AppError("You do not have permission to perform this action", 403)
      );
    }
    next();
  };
};

/**
 * PATCH /api/v1/auth/updateMyPassword
 * Body: { currentPassword, newPassword }
 * Re-hashes the password and re-issues tokens.
 */
export const updateMyPassword = catchAsync(
  async (
    req: Request & { user?: IUser },
    res: Response,
    next: NextFunction
  ) => {
    if (!req.user) return next(new AppError("Not authenticated", 401));
    const { currentPassword, newPassword } = req.body ?? {};
    if (!currentPassword || !newPassword)
      return next(new AppError("Current and new password are required", 400));

    const user = await User.findById(req.user._id).select("+passwordHash");
    if (!user) return next(new AppError("User no longer exists", 404));

    const ok = await argon2.verify(user.password, currentPassword);
    if (!ok) return next(new AppError("Your current password is wrong", 401));

    user.password = await argon2.hash(newPassword, {
      type: argon2.argon2id,
    });
    (user as any).passwordChangedAt = new Date();
    await user.save();

    const { access, user: safe } = await issueTokens(user, res);
    res.status(200).json({
      status: "success",
      access_token: access,
      user: safe,
      expires_in: ACCESS_TTL_SEC,
    });
  }
);
