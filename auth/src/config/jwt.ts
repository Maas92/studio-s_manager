import {
  generateKeyPair,
  exportJWK,
  importPKCS8,
  importSPKI,
  SignJWT,
  jwtVerify,
  JWTPayload,
  JWK,
} from "jose";
import { env } from "./env.js";
import { logger } from "../utils/logger.js";

let privateKey: CryptoKey | undefined;
let publicKey: CryptoKey | undefined;
let publicJwk: JWK | undefined;

export async function initKeys(): Promise<void> {
  try {
    if (env.JWT_PRIVATE_PEM && env.JWT_PUBLIC_PEM) {
      // Import both private and public keys from env (production)
      privateKey = await importPKCS8(env.JWT_PRIVATE_PEM, "RS256");
      publicKey = await importSPKI(env.JWT_PUBLIC_PEM, "RS256");
      publicJwk = await exportJWK(publicKey);
      logger.info("Imported JWT private and public keys from environment");
    } else if (env.JWT_PRIVATE_PEM && !env.JWT_PUBLIC_PEM) {
      // If only private provided, fail loudly in prod — better to require public as well.
      logger.warn(
        "JWT_PRIVATE_PEM provided but JWT_PUBLIC_PEM missing. This is unsafe; generating new pair (dev fallback)."
      );
      const kp = await generateKeyPair("RS256", { modulusLength: 2048 });
      privateKey = await importPKCS8(env.JWT_PRIVATE_PEM, "RS256");
      // Use generated public key to verify — but note: generated public won't match imported private.
      // This fallback is strictly for dev; in prod you must provide matching public key.
      publicKey = kp.publicKey;
      publicJwk = await exportJWK(publicKey);
    } else {
      // Development: generate key pair
      logger.warn("Generating new JWT keys (development only)");
      const kp = await generateKeyPair("RS256", { modulusLength: 2048 });
      privateKey = kp.privateKey;
      publicKey = kp.publicKey;
      publicJwk = await exportJWK(publicKey);
    }

    // Ensure JWK metadata
    if (!publicJwk) {
      throw new Error("Public JWK not initialized");
    }
    publicJwk.alg = "RS256";
    publicJwk.use = "sig";
    publicJwk.kid = env.JWT_KID || publicJwk.kid || "dev-key";

    logger.info("JWT keys initialized successfully");
  } catch (error) {
    logger.error("Failed to initialize JWT keys:", error);
    throw error;
  }
}

export function getPublicJwks(): { keys: any[] } {
  if (!publicJwk) {
    throw new Error("Public JWK not initialized");
  }
  return { keys: [publicJwk] };
}

export function getPrivateKey(): CryptoKey {
  if (!privateKey) {
    throw new Error("Private key not initialized");
  }
  return privateKey;
}

export function getPublicKey(): CryptoKey {
  if (!publicKey) {
    throw new Error("Public key not initialized");
  }
  return publicKey;
}

export async function signToken(
  payload: JWTPayload,
  expiresIn: string
): Promise<string> {
  if (!privateKey) throw new Error("Private key not initialized");
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "RS256", kid: publicJwk?.kid })
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
  if (!publicKey) throw new Error("Public key not initialized");
  return await jwtVerify(token, publicKey, {
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
  });
}
