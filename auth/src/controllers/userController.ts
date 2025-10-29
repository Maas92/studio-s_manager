import { Request, Response, NextFunction } from "express";
import User, { IUser } from "../models/userModel.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";

interface AuthRequest extends Request {
  user?: IUser;
}

const filterObj = (obj: any, ...allowedFields: string[]): any => {
  const newObj: any = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

export const getAllUsers = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const users = await User.find();

    res.status(200).json({
      status: "success",
      results: users.length,
      data: {
        users,
      },
    });
  }
);

export const getUser = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const user = await User.findById(req.params.id);

    if (!user) {
      return next(new AppError("No user found with that ID", 404));
    }

    res.status(200).json({
      status: "success",
      data: {
        user,
      },
    });
  }
);

export const getMe = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  req.params.id = req.user!.id;
  next();
};

export const updateMe = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    // 1) Create error if user POSTs password data
    if (req.body.password || req.body.passwordConfirm) {
      return next(
        new AppError(
          "This route is not for password updates. Please use /updateMyPassword.",
          400
        )
      );
    }

    // 2) Filter out unwanted fields
    const filteredBody = filterObj(
      req.body,
      "firstName",
      "lastName",
      "email",
      "phone",
      "bio",
      "specializations",
      "profileImage"
    );

    // 3) Update user document
    const updatedUser = await User.findByIdAndUpdate(
      req.user!.id,
      filteredBody,
      {
        new: true,
        runValidators: true,
      }
    );

    res.status(200).json({
      status: "success",
      data: {
        user: updatedUser,
      },
    });
  }
);

export const deleteMe = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    await User.findByIdAndUpdate(req.user!.id, { active: false });

    res.status(204).json({
      status: "success",
      data: null,
    });
  }
);

export const createUser = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const newUser = await User.create(req.body);

    res.status(201).json({
      status: "success",
      data: {
        user: newUser,
      },
    });
  }
);

export const updateUser = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    // Don't allow password updates through this route
    if (req.body.password || req.body.passwordConfirm) {
      return next(new AppError("This route is not for password updates.", 400));
    }

    const user = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!user) {
      return next(new AppError("No user found with that ID", 404));
    }

    res.status(200).json({
      status: "success",
      data: {
        user,
      },
    });
  }
);

export const deleteUser = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const user = await User.findByIdAndUpdate(req.params.id, { active: false });

    if (!user) {
      return next(new AppError("No user found with that ID", 404));
    }

    res.status(204).json({
      status: "success",
      data: null,
    });
  }
);
