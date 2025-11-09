import {
  generateKeyPair,
  exportJWK,
  importPKCS8,
  SignJWT,
  jwtVerify,
  JWTPayload,
} from "jose";
import { env } from "./env.js";
import { logger } from "../utils/logger.js";

let privateKey: CryptoKey;
let publicJwk: any;

export async function initKeys(): Promise<void> {
  try {
    if (env.JWT_PRIVATE_PEM) {
      // Import existing private key
      privateKey = await importPKCS8(env.JWT_PRIVATE_PEM, "RS256");
      logger.info("JWT private key imported from environment");

      // Generate a key pair to extract public key
      const kp = await generateKeyPair("RS256", { modulusLength: 2048 });
      publicJwk = await exportJWK(kp.publicKey);
    } else {
      // Generate new key pair (development only)
      logger.warn("Generating new JWT keys (not recommended for production)");
      const kp = await generateKeyPair("RS256", { modulusLength: 2048 });
      privateKey = kp.privateKey;
      publicJwk = await exportJWK(kp.publicKey);
    }

    publicJwk.alg = "RS256";
    publicJwk.use = "sig";
    publicJwk.kid = env.JWT_KID;

    logger.info("JWT keys initialized successfully");
  } catch (error) {
    logger.error("Failed to initialize JWT keys:", error);
    throw error;
  }
}

export function getPublicJwks(): { keys: any[] } {
  return { keys: [publicJwk] };
}

export function getPrivateKey(): CryptoKey {
  if (!privateKey) {
    throw new Error("Private key not initialized");
  }
  return privateKey;
}

export async function signToken(
  payload: JWTPayload,
  expiresIn: string
): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "RS256", kid: publicJwk.kid })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .setIssuer(env.JWT_ISSUER)
    .setAudience(env.JWT_AUDIENCE)
    .sign(privateKey);
}

export async function verifyToken(token: string): Promise<{
  payload: JWTPayload;
  protectedHeader: any;
}> {
  return await jwtVerify(token, privateKey, {
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
  });
}
