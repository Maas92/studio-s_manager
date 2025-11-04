// src/controllers/authController.ts
import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import User, { IUser } from "../models/userModel.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import { signAccess, verifyAccessRS256 } from "../utils/jwt.js";

interface AuthRequest extends Request {
  user?: IUser;
}

const createSendToken = (
  user: IUser,
  statusCode: number,
  res: Response
): void => {
  // JWT payload aligns with src/utils/jwt.ts (Claims: { sub, role? })
  const token = signAccess({
    sub: user._id.toString(),
    role: user.role,
    email: user.email,
  });

  const cookieDays = parseInt(process.env.JWT_COOKIE_EXPIRES_IN || "90", 10);
  const cookieOptions = {
    expires: new Date(Date.now() + cookieDays * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
  };

  res.cookie("jwt", token, cookieOptions);

  // Hide password on the wire
  (user as any).password = undefined;

  res.status(statusCode).json({
    status: "success",
    token,
    data: { user },
  });
};

export const signup = catchAsync(async (req: Request, res: Response) => {
  const newUser = await User.create({
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    email: req.body.email,
    phone: req.body.phone,
    role: req.body.role,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    specializations: req.body.specializations,
    bio: req.body.bio,
    hireDate: req.body.hireDate,
  });

  createSendToken(newUser, 201, res);
});

export const login = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(new AppError("Please provide email and password!", 400));
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await user.correctPassword(password, user.password))) {
      return next(new AppError("Incorrect email or password", 401));
    }

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    createSendToken(user, 200, res);
  }
);

export const logout = (_req: Request, res: Response): void => {
  res.cookie("jwt", "loggedout", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ status: "success" });
};

export const protect = catchAsync(
  async (req: AuthRequest, _res: Response, next: NextFunction) => {
    // 1) Get token
    let token: string | undefined;
    if (req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    } else if ((req as any).cookies?.jwt) {
      token = (req as any).cookies.jwt;
    }

    if (!token) {
      return next(new AppError("You are not logged in!", 401));
    }

    // 2) Verify token
    const decoded = await verifyAccessRS256(token); // matches Claims: { sub, role?, iat, exp, ... }

    // 3) Check if user still exists
    const userId = decoded.payload.sub as string;
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      return next(new AppError("The user no longer exists.", 401));
    }

    // 4) Check if user changed password after token was issued
    if (currentUser.changedPasswordAfter(decoded.payload.iat ?? 0)) {
      return next(
        new AppError(
          "User recently changed password! Please log in again.",
          401
        )
      );
    }

    req.user = currentUser;
    next();
  }
);

export const restrictTo = (...roles: string[]) => {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(
        new AppError("You do not have permission to perform this action", 403)
      );
    }
    next();
  };
};

export const forgotPassword = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return next(
        new AppError("There is no user with that email address.", 404)
      );
    }

    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    try {
      res.status(200).json({
        status: "success",
        message: "Token sent to email!",
        resetToken, // TODO: send via email instead of returning in production
      });
    } catch {
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });
      return next(
        new AppError(
          "There was an error sending the email. Try again later!",
          500
        )
      );
    }
  }
);

export const resetPassword = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const hashedToken = crypto
      .createHash("sha256")
      .update(req.params.token)
      .digest("hex");

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      return next(new AppError("Token is invalid or has expired", 400));
    }

    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    createSendToken(user, 200, res);
  }
);

export const updatePassword = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const user = await User.findById(req.user!.id).select("+password");
    if (!user) {
      return next(new AppError("User not found", 404));
    }

    const correct = await user.correctPassword(
      req.body.passwordCurrent,
      user.password
    );
    if (!correct) {
      return next(new AppError("Your current password is wrong.", 401));
    }

    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    await user.save();

    createSendToken(user, 200, res);
  }
);
