// src/utils/jwt.ts
import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";

const mustEnv = (k: string): string => {
  const v = process.env[k];
  if (!v) throw new Error(`Missing env: ${k}`);
  return v;
};

const JWT_SECRET: string = mustEnv("JWT_SECRET");

// Parse number of seconds from env (default 3600 = 1h)
const EXPIRES_IN_SECONDS: number = Number(
  process.env.JWT_EXPIRES_IN_SECONDS ?? 3600
);

export interface Claims extends JwtPayload {
  sub: string;
  role?: string;
}

export function signToken(payload: Claims): string {
  const opts: SignOptions = {
    algorithm: "HS256",
    expiresIn: EXPIRES_IN_SECONDS, // number, avoids StringValue typing
  };
  return jwt.sign(payload, JWT_SECRET, opts);
}

export function verifyToken(token: string): Claims {
  return jwt.verify(token, JWT_SECRET) as Claims;
}
