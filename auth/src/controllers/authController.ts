import { Request, Response, NextFunction } from "express";
import { authService } from "../services/authService.js";
import { tokenService } from "../services/tokenService.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

function setRefreshCookie(res: Response, token: string): void {
  res.cookie("refresh_token", token, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAMESITE,
    path: "/api/v1/auth/refresh",
    maxAge: env.REFRESH_TOKEN_TTL_SEC * 1000,
    domain: env.COOKIE_DOMAIN === "localhost" ? undefined : env.COOKIE_DOMAIN,
  });
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie("refresh_token", {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAMESITE,
    path: "/api/v1/auth/refresh",
    domain: env.COOKIE_DOMAIN === "localhost" ? undefined : env.COOKIE_DOMAIN,
  });
}

/**
 * POST /api/v1/auth/signup
 */
export const signup = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { user, accessToken, refreshToken } = await authService.signup(
      req.body
    );

    setRefreshCookie(res, refreshToken);

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
        accessToken,
        expiresIn: env.ACCESS_TOKEN_TTL_SEC,
      },
    });
  }
);

/**
 * POST /api/v1/auth/login
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

    setRefreshCookie(res, refreshToken);

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
        accessToken,
        expiresIn: env.ACCESS_TOKEN_TTL_SEC,
      },
    });
  }
);

/**
 * POST /api/v1/auth/refresh
 */
export const refresh = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const refreshToken = req.cookies?.refresh_token;

    if (!refreshToken) {
      throw AppError.unauthorized("Refresh token not found");
    }

    const ip = req.ip;
    const userAgent = req.get("user-agent");

    const { accessToken, refreshToken: newRefreshToken } =
      await authService.refreshTokens(refreshToken, ip, userAgent);

    setRefreshCookie(res, newRefreshToken);

    res.status(200).json({
      status: "success",
      data: {
        accessToken,
        expiresIn: env.ACCESS_TOKEN_TTL_SEC,
      },
    });
  }
);

/**
 * POST /api/v1/auth/logout
 */
export const logout = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const refreshToken = req.cookies?.refresh_token;

    if (refreshToken) {
      await authService.logout(refreshToken);
    }

    clearRefreshCookie(res);

    res.status(200).json({
      status: "success",
      message: "Logged out successfully",
    });
  }
);

/**
 * GET /api/v1/auth/me
 */
export const me = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw AppError.unauthorized("Not authenticated");
    }

    res.status(200).json({
      status: "success",
      data: {
        user: {
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
      },
    });
  }
);

/**
 * PATCH /api/v1/auth/update-password
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

    setRefreshCookie(res, refreshToken);

    res.status(200).json({
      status: "success",
      message: "Password updated successfully",
      data: {
        accessToken,
        expiresIn: env.ACCESS_TOKEN_TTL_SEC,
      },
    });
  }
);

/**
 * POST /api/v1/auth/forgot-password
 */
export const forgotPassword = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { email } = req.body;

    const resetToken = await authService.forgotPassword(email);

    // In production, send this via email instead of returning it
    // For now, we'll return it (remove in production)
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
 * PATCH /api/v1/auth/reset-password/:token
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
