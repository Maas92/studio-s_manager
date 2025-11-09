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
    // Check if user already exists
    const existingUser = await User.findOne({ email: data.email });
    if (existingUser) {
      throw AppError.conflict("Email already in use");
    }

    // Hash password with Argon2id
    const passwordHash = await argon2.hash(data.password, {
      type: argon2.argon2id,
      memoryCost: 65536, // 64 MiB
      timeCost: 3,
      parallelism: 4,
    });

    // Create user
    const user = await User.create({
      email: data.email,
      password: passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      name: data.name,
      role: data.role || "therapist",
    });

    logger.info(`New user created: ${user.email}`);

    // Generate tokens
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
    // Find user with password field
    const user = await User.findOne({ email: credentials.email }).select(
      "+password"
    );

    if (!user) {
      throw AppError.unauthorized("Invalid email or password");
    }

    // Verify password
    const isValidPassword = await argon2.verify(
      user.password,
      credentials.password
    );

    if (!isValidPassword) {
      logger.warn(`Failed login attempt for user: ${credentials.email}`);
      throw AppError.unauthorized("Invalid email or password");
    }

    // Check if user is active
    if (!user.active) {
      throw AppError.unauthorized("Your account has been deactivated");
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    logger.info(`User logged in: ${user.email}`);

    // Generate tokens
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
    // Validate refresh token
    const validation = await tokenService.validateRefreshToken(refreshToken);

    if (!validation.valid || !validation.userId) {
      throw AppError.unauthorized("Invalid or expired refresh token");
    }

    // Get user
    const user = await User.findById(validation.userId);
    if (!user) {
      throw AppError.unauthorized("User no longer exists");
    }

    if (!user.active) {
      throw AppError.unauthorized("Your account has been deactivated");
    }

    // Revoke old token
    if (validation.jti) {
      await tokenService.revokeRefreshToken(validation.jti);
    }

    // Generate new token pair
    const tokens = await tokenService.generateTokenPair(user, ip, userAgent);

    logger.info(`Tokens refreshed for user: ${user.email}`);

    return tokens;
  }

  async logout(refreshToken: string): Promise<void> {
    try {
      const validation = await tokenService.validateRefreshToken(refreshToken);
      if (validation.valid && validation.jti) {
        await tokenService.revokeRefreshToken(validation.jti);
        logger.info(`User logged out, token revoked: ${validation.jti}`);
      }
    } catch (error) {
      logger.error("Logout error:", error);
      // Don't throw error on logout
    }
  }

  async updatePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<{ accessToken: string; refreshToken: string }> {
    // Get user with password
    const user = await User.findById(userId).select("+password");
    if (!user) {
      throw AppError.notFound("User not found");
    }

    // Verify current password
    const isValidPassword = await argon2.verify(user.password, currentPassword);

    if (!isValidPassword) {
      throw AppError.unauthorized("Current password is incorrect");
    }

    // Hash new password
    const passwordHash = await argon2.hash(newPassword, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    // Update password
    user.password = passwordHash;
    user.passwordChangedAt = new Date();
    await user.save();

    logger.info(`Password updated for user: ${user.email}`);

    // Revoke all existing sessions
    await tokenService.revokeAllUserTokens(userId);

    // Generate new tokens
    const { accessToken, refreshToken } = await tokenService.generateTokenPair(
      user
    );

    return { accessToken, refreshToken };
  }

  async forgotPassword(email: string): Promise<string> {
    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if user exists
      logger.warn(`Password reset requested for non-existent user: ${email}`);
      return ""; // Return empty token
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Save to user
    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await user.save({ validateBeforeSave: false });

    logger.info(`Password reset token generated for user: ${user.email}`);

    return resetToken; // Return unhashed token to send via email
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    // Hash the token to compare with stored hash
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // Find user with valid reset token
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      throw AppError.badRequest("Invalid or expired reset token");
    }

    // Hash new password
    const passwordHash = await argon2.hash(newPassword, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    // Update password and clear reset token
    user.password = passwordHash;
    user.passwordChangedAt = new Date();
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    logger.info(`Password reset completed for user: ${user.email}`);

    // Revoke all sessions
    await tokenService.revokeAllUserTokens(String(user._id));
  }
}

export const authService = new AuthService();
