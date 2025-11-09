import crypto from "crypto";
import { JWTPayload } from "jose";
import { signToken } from "../config/jwt.js";
import { env } from "../config/env.js";
import Session, { hashToken } from "../models/sessionModel.js";
import { IUser } from "../models/userModel.js";
import { logger } from "../utils/logger.js";

export class TokenService {
  async generateAccessToken(user: IUser): Promise<string> {
    const payload: JWTPayload = {
      sub: String(user._id),
      email: user.email,
      role: user.role,
    };

    return await signToken(payload, `${env.ACCESS_TOKEN_TTL_SEC}s`);
  }

  async generateRefreshToken(user: IUser): Promise<string> {
    const jti = crypto.randomBytes(32).toString("hex");
    const payload: JWTPayload = {
      sub: String(user._id),
      email: user.email,
      role: user.role,
      jti,
    };

    return await signToken(payload, `${env.REFRESH_TOKEN_TTL_SEC}s`);
  }

  async generateTokenPair(
    user: IUser,
    ip?: string,
    userAgent?: string
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const [accessToken, refreshToken] = await Promise.all([
      this.generateAccessToken(user),
      this.generateRefreshToken(user),
    ]);

    // Store refresh token session
    const jti = this.extractJtiFromToken(refreshToken);
    await this.storeRefreshSession(user, jti, refreshToken, ip, userAgent);

    return { accessToken, refreshToken };
  }

  async storeRefreshSession(
    user: IUser,
    jti: string,
    refreshToken: string,
    ip?: string,
    userAgent?: string
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_SEC * 1000);

    await Session.create({
      user: user._id,
      jti,
      tokenHash: hashToken(refreshToken),
      expiresAt,
      ip,
      ua: userAgent,
    });

    logger.info(`Refresh session created for user ${user._id}`);
  }

  async validateRefreshToken(
    refreshToken: string
  ): Promise<{ valid: boolean; jti?: string; userId?: string }> {
    try {
      const jti = this.extractJtiFromToken(refreshToken);
      const tokenHash = hashToken(refreshToken);

      const session = await Session.findOne({ jti });

      if (!session) {
        logger.warn(`Session not found for jti: ${jti}`);
        return { valid: false };
      }

      if (session.revokedAt) {
        logger.warn(`Revoked token used: ${jti}`);
        return { valid: false };
      }

      if (session.expiresAt < new Date()) {
        logger.warn(`Expired token used: ${jti}`);
        return { valid: false };
      }

      if (session.tokenHash !== tokenHash) {
        logger.warn(`Token hash mismatch for jti: ${jti}`);
        return { valid: false };
      }

      return { valid: true, jti, userId: String(session.user) };
    } catch (error) {
      logger.error("Token validation error:", error);
      return { valid: false };
    }
  }

  async revokeRefreshToken(jti: string): Promise<void> {
    await Session.updateOne({ jti }, { $set: { revokedAt: new Date() } });
    logger.info(`Refresh token revoked: ${jti}`);
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await Session.updateMany(
      { user: userId, revokedAt: null },
      { $set: { revokedAt: new Date() } }
    );
    logger.info(`All tokens revoked for user: ${userId}`);
  }

  private extractJtiFromToken(token: string): string {
    // Decode JWT without verification (we'll verify separately)
    const parts = token.split(".");
    if (parts.length !== 3) {
      throw new Error("Invalid token format");
    }

    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());

    if (!payload.jti) {
      throw new Error("Token missing jti claim");
    }

    return payload.jti;
  }

  async cleanupExpiredSessions(): Promise<void> {
    const result = await Session.deleteMany({
      expiresAt: { $lt: new Date() },
    });
    logger.info(`Cleaned up ${result.deletedCount} expired sessions`);
  }
}

export const tokenService = new TokenService();
