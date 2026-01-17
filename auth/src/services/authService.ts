import argon2 from "argon2";
import crypto from "crypto";
import User, { IUser } from "../models/userModel.js";
import { tokenService } from "./tokenService.js";
import AppError from "../utils/appError.js";
import { logger } from "../utils/logger.js";
import { SignupInput, LoginInput } from "../utils/validators.js";

export class AuthService {
  async signup(data: SignupInput): Promise<{
    user: IUser;
    accessToken: string;
    refreshToken: string;
  }> {
    const existingUser = await User.findOne({ email: data.email });
    if (existingUser) {
      throw AppError.conflict("Email already in use");
    }

    const passwordHash = await argon2.hash(data.password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    const user = await User.create({
      email: data.email,
      password: passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      name: data.name,
      role: data.role || "therapist",
    });

    logger.info({ userId: user.id, email: user.email }, "👤 New user created");

    const { accessToken, refreshToken } = await tokenService.generateTokenPair(
      user
    );

    return { user, accessToken, refreshToken };
  }

  async login(
    credentials: LoginInput,
    ip?: string,
    userAgent?: string
  ): Promise<{
    user: IUser;
    accessToken: string;
    refreshToken: string;
  }> {
    const user = await User.findOne({ email: credentials.email })
      .select("+password +active")
      .exec();

    logger.debug(
      {
        email: credentials.email,
        userFound: !!user,
      },
      "🔐 Login attempt"
    );

    if (!user) {
      throw AppError.unauthorized("Invalid email or password");
    }

    const isValidPassword = await argon2.verify(
      user.password,
      credentials.password
    );

    logger.debug(
      {
        email: user.email,
        passwordValid: isValidPassword,
      },
      "🔑 Password verification result"
    );

    if (!isValidPassword) {
      logger.warn({ email: credentials.email }, "⚠️ Failed login attempt");
      throw AppError.unauthorized("Invalid email or password");
    }

    if (!user.active) {
      throw AppError.unauthorized("Your account has been deactivated");
    }

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    logger.info({ userId: user.id, email: user.email }, "✅ User logged in");

    const { accessToken, refreshToken } = await tokenService.generateTokenPair(
      user,
      ip,
      userAgent
    );

    return { user, accessToken, refreshToken };
  }

  async refreshTokens(
    refreshToken: string,
    ip?: string,
    userAgent?: string
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const validation = await tokenService.validateRefreshToken(refreshToken);

    if (!validation.valid || !validation.userId) {
      throw AppError.unauthorized("Invalid or expired refresh token");
    }

    const user = await User.findById(validation.userId).select("+active");
    if (!user) {
      throw AppError.unauthorized("User no longer exists");
    }

    if (!user.active) {
      throw AppError.unauthorized("Your account has been deactivated");
    }

    if (validation.jti) {
      await tokenService.revokeRefreshToken(validation.jti);
    }

    const tokens = await tokenService.generateTokenPair(user, ip, userAgent);

    logger.info({ userId: user.id }, "🔁 Tokens refreshed");

    return tokens;
  }

  async logout(refreshToken: string): Promise<void> {
    try {
      const validation = await tokenService.validateRefreshToken(refreshToken);

      if (validation.valid && validation.jti) {
        await tokenService.revokeRefreshToken(validation.jti);

        logger.info({ jti: validation.jti }, "🚪 User logged out");
      }
    } catch (err) {
      logger.error({ err }, "❌ Logout error");
    }
  }

  async updatePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const user = await User.findById(userId).select("+password");
    if (!user) {
      throw AppError.notFound("User not found");
    }

    const isValidPassword = await argon2.verify(user.password, currentPassword);

    if (!isValidPassword) {
      throw AppError.unauthorized("Current password is incorrect");
    }

    user.password = await argon2.hash(newPassword, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    user.passwordChangedAt = new Date();
    await user.save();

    logger.info({ userId: user.id }, "🔐 Password updated");

    await tokenService.revokeAllUserTokens(userId);

    return tokenService.generateTokenPair(user);
  }

  async forgotPassword(email: string): Promise<string> {
    const user = await User.findOne({ email });

    if (!user) {
      logger.warn(
        { email },
        "⚠️ Password reset requested for non-existent user"
      );
      return "";
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save({ validateBeforeSave: false });

    logger.info({ userId: user.id }, "📧 Password reset token generated");

    return resetToken;
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      throw AppError.badRequest("Invalid or expired reset token");
    }

    user.password = await argon2.hash(newPassword, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    user.passwordChangedAt = new Date();
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    logger.info({ userId: user.id }, "🔑 Password reset completed");

    await tokenService.revokeAllUserTokens(String(user._id));
  }
}

export const authService = new AuthService();
