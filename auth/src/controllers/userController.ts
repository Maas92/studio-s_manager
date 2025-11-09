import { Request, Response, NextFunction } from "express";
import { userService } from "../services/userService.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";

/**
 * GET /api/v1/users
 */
export const getAllUsers = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { role, active, search } = req.query;

    const filters = {
      role: role as string | undefined,
      active: active === "true" ? true : active === "false" ? false : undefined,
      search: search as string | undefined,
    };

    const users = await userService.getAllUsers(filters);

    res.status(200).json({
      status: "success",
      results: users.length,
      data: { users },
    });
  }
);

/**
 * GET /api/v1/users/stats
 */
export const getUserStats = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const stats = await userService.getUserStats();

    res.status(200).json({
      status: "success",
      data: { stats },
    });
  }
);

/**
 * GET /api/v1/users/:id
 */
export const getUser = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const user = await userService.getUser(req.params.id);

    res.status(200).json({
      status: "success",
      data: { user },
    });
  }
);

/**
 * GET /api/v1/users/me
 */
export const getMe = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw AppError.unauthorized("Not authenticated");
    }

    // Reuse getUser but with current user's ID
    req.params.id = String(req.user._id);
    return getUser(req, res, next);
  }
);

/**
 * PATCH /api/v1/users/me
 */
export const updateMe = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw AppError.unauthorized("Not authenticated");
    }

    // Prevent password updates through this route
    if (req.body.password || req.body.passwordConfirm) {
      throw AppError.badRequest(
        "This route is not for password updates. Use /auth/update-password"
      );
    }

    const user = await userService.updateUser(String(req.user._id), req.body);

    res.status(200).json({
      status: "success",
      data: { user },
    });
  }
);

/**
 * DELETE /api/v1/users/me
 */
export const deleteMe = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw AppError.unauthorized("Not authenticated");
    }

    await userService.deactivateUser(String(req.user._id));

    res.status(204).json({
      status: "success",
      data: null,
    });
  }
);

/**
 * PATCH /api/v1/users/:id (Admin only)
 */
export const updateUser = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    if (req.body.password || req.body.passwordConfirm) {
      throw AppError.badRequest("This route is not for password updates");
    }

    const user = await userService.updateUser(req.params.id, req.body);

    res.status(200).json({
      status: "success",
      data: { user },
    });
  }
);

/**
 * DELETE /api/v1/users/:id (Admin only)
 */
export const deleteUser = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await userService.deactivateUser(req.params.id);

    res.status(204).json({
      status: "success",
      data: null,
    });
  }
);
