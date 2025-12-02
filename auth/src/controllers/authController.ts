import { Request, Response, NextFunction } from "express";
import { authService } from "../services/authService.js";
import { tokenService } from "../services/tokenService.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

// Get cookie domain (undefined for localhost to avoid issues)
const getCookieDomain = () => {
  return env.COOKIE_DOMAIN === "localhost" ? undefined : env.COOKIE_DOMAIN;
};

// Set access token cookie (for authentication)
function setAccessTokenCookie(res: Response, token: string): void {
  res.cookie("jwt", token, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAMESITE,
    path: "/", // CRITICAL: Must be "/" to send to all routes
    maxAge: env.ACCESS_TOKEN_TTL_SEC * 1000,
    domain: getCookieDomain(),
  });
}

// Set refresh token cookie (for token refresh only)
function setRefreshTokenCookie(res: Response, token: string): void {
  res.cookie("refreshToken", token, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAMESITE,
    path: "/", // Changed from "/api/v1/auth/refresh" to "/"
    maxAge: env.REFRESH_TOKEN_TTL_SEC * 1000,
    domain: getCookieDomain(),
  });
}

// Clear both cookies on logout
function clearAuthCookies(res: Response): void {
  const cookieOptions = {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAMESITE,
    path: "/",
    domain: getCookieDomain(),
  };

  res.clearCookie("jwt", cookieOptions);
  res.clearCookie("refreshToken", cookieOptions);
}

/**
 * POST /auth/signup
 */
export const signup = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { user, accessToken, refreshToken } = await authService.signup(
      req.body
    );

    // Set both cookies
    setAccessTokenCookie(res, accessToken);
    setRefreshTokenCookie(res, refreshToken);

    res.status(201).json({
      status: "success",
      data: {
        user: {
          id: user._id,
          email: user.email,
          role: user.role,
          name: user.name,
          firstName: user.firstName,
          lastName: user.lastName,
        },
      },
    });
  }
);

/**
 * POST /auth/login
 */
export const login = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip;
    const userAgent = req.get("user-agent");

    const { user, accessToken, refreshToken } = await authService.login(
      req.body,
      ip,
      userAgent
    );

    // Set both cookies
    setAccessTokenCookie(res, accessToken);
    setRefreshTokenCookie(res, refreshToken);

    res.status(200).json({
      status: "success",
      data: {
        user: {
          id: user._id,
          email: user.email,
          role: user.role,
          name: user.name,
          firstName: user.firstName,
          lastName: user.lastName,
          lastLogin: user.lastLogin,
        },
      },
    });
  }
);

/**
 * POST /auth/refresh
 */
export const refresh = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      throw AppError.unauthorized("Refresh token not found");
    }

    const ip = req.ip;
    const userAgent = req.get("user-agent");

    const { accessToken, refreshToken: newRefreshToken } =
      await authService.refreshTokens(refreshToken, ip, userAgent);

    // Set new cookies
    setAccessTokenCookie(res, accessToken);
    setRefreshTokenCookie(res, newRefreshToken);

    res.status(200).json({
      status: "success",
      message: "Tokens refreshed successfully",
    });
  }
);

/**
 * POST /auth/logout
 */
export const logout = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const refreshToken = req.cookies?.refreshToken;

    if (refreshToken) {
      await authService.logout(refreshToken);
    }

    clearAuthCookies(res);

    res.status(200).json({
      status: "success",
      message: "Logged out successfully",
    });
  }
);

/**
 * GET /auth/me
 */
export const me = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw AppError.unauthorized("Not authenticated");
    }

    res.status(200).json({
      status: "success",
      data: {
        id: req.user._id,
        email: req.user.email,
        role: req.user.role,
        name: req.user.name,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        phone: req.user.phone,
        bio: req.user.bio,
        specializations: req.user.specializations,
        profileImage: req.user.profileImage,
        createdAt: req.user.createdAt,
        lastLogin: req.user.lastLogin,
      },
    });
  }
);

/**
 * PATCH /auth/update-password
 */
export const updatePassword = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw AppError.unauthorized("Not authenticated");
    }

    const { currentPassword, newPassword } = req.body;

    const { accessToken, refreshToken } = await authService.updatePassword(
      String(req.user._id),
      currentPassword,
      newPassword
    );

    // Set new cookies after password change
    setAccessTokenCookie(res, accessToken);
    setRefreshTokenCookie(res, refreshToken);

    res.status(200).json({
      status: "success",
      message: "Password updated successfully",
    });
  }
);

/**
 * POST /auth/forgot-password
 */
export const forgotPassword = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { email } = req.body;

    const resetToken = await authService.forgotPassword(email);

    // In production, send this via email instead of returning it
    if (env.NODE_ENV === "development" && resetToken) {
      res.status(200).json({
        status: "success",
        message: "Password reset token sent to email",
        resetToken, // REMOVE IN PRODUCTION
      });
    } else {
      res.status(200).json({
        status: "success",
        message: "If that email exists, a password reset link has been sent",
      });
    }
  }
);

/**
 * PATCH /auth/reset-password/:token
 */
export const resetPassword = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { token } = req.params;
    const { password } = req.body;

    await authService.resetPassword(token, password);

    res.status(200).json({
      status: "success",
      message:
        "Password reset successful. Please log in with your new password",
    });
  }
);
