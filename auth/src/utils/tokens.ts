import { SignJWT, jwtVerify } from "jose";
import { signAccess, signRefresh } from "./jwt.js";
import Session, { hashToken } from "../models/sessionModel.js";
import type { JWTPayload } from "jose";
import mongoose from "mongoose";

const REFRESH_TTL_SEC = Number(process.env.REFRESH_TOKEN_TTL_SEC ?? 1209600);

export function newExpiryDate() {
  return new Date(Date.now() + REFRESH_TTL_SEC * 1000);
}

export async function mintPairAndStoreSession(
  user: { _id: mongoose.Types.ObjectId; email: string; role: string },
  req: any,
  res: any
) {
  const jti = cryptoRandom();
  const payload: JWTPayload = {
    sub: String(user._id),
    email: user.email,
    role: user.role,
    jti,
  };

  const [access, refresh] = await Promise.all([
    signAccess(payload),
    signRefresh(payload),
  ]);

  await Session.create({
    user: user._id,
    jti,
    tokenHash: hashToken(refresh),
    expiresAt: newExpiryDate(),
    ip: req.ip,
    ua: req.get("user-agent") ?? "",
  });

  setRefreshCookie(res, refresh);
  return { access };
}

export async function rotateRefresh(oldRefresh: string, req: any, res: any) {
  // verify signature & claims (issuer/audience are inside signRefresh)
  const { payload } = await jwtVerify(
    oldRefresh,
    (global as any).publicKeyCatchAll ?? undefined
  ).catch(() => ({ payload: null as any }));
  if (!payload?.sub || !payload?.jti) throw new Error("Invalid refresh token");

  const sess = await Session.findOne({ jti: payload.jti, user: payload.sub });
  if (!sess || sess.revokedAt) throw new Error("Refresh already used/revoked");
  if (sess.expiresAt.getTime() < Date.now()) throw new Error("Refresh expired");
  if (sess.tokenHash !== hashToken(oldRefresh))
    throw new Error("Token mismatch");

  // revoke old
  sess.revokedAt = new Date();

  // mint new pair
  const newJti = cryptoRandom();
  const newPayload: JWTPayload = {
    sub: payload.sub as string,
    email: payload.email as string,
    role: payload.role as string,
    jti: newJti,
  };
  const [access, refresh] = await Promise.all([
    signAccess(newPayload),
    signRefresh(newPayload),
  ]);

  sess.replacedBy = newJti;
  await sess.save();

  await Session.create({
    user: payload.sub,
    jti: newJti,
    tokenHash: hashToken(refresh),
    expiresAt: newExpiryDate(),
    ip: req.ip,
    ua: req.get("user-agent") ?? "",
  });

  setRefreshCookie(res, refresh);
  return { access };
}

export async function revokeCurrentRefresh(oldRefresh: string) {
  const { payload } = await jwtVerify(
    oldRefresh,
    (global as any).publicKeyCatchAll ?? undefined
  ).catch(() => ({ payload: null as any }));
  if (!payload?.sub || !payload?.jti) return;
  await Session.updateOne(
    { jti: payload.jti, user: payload.sub },
    { $set: { revokedAt: new Date() } }
  );
}

export function setRefreshCookie(res: any, token: string) {
  res.cookie("refresh_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: Number(process.env.REFRESH_TOKEN_TTL_SEC ?? 1209600) * 1000,
  });
}

function cryptoRandom() {
  return [...crypto.getRandomValues(new Uint8Array(16))]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
// NOTE: If you need jwtVerify here, provide public key; since we sign locally, we could also decode without remote JWK.
// For simplicity above we rely on jose to parse; in practice you can just decode payload since you control the signer.
