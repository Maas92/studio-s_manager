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
      // 🔐 Production: import matching key pair
      privateKey = await importPKCS8(env.JWT_PRIVATE_PEM, "RS256");
      publicKey = await importSPKI(env.JWT_PUBLIC_PEM, "RS256");
      publicJwk = await exportJWK(publicKey);

      logger.info("🔐 Imported JWT private and public keys from environment");
    } else if (env.JWT_PRIVATE_PEM && !env.JWT_PUBLIC_PEM) {
      // ❌ Never allow mismatched keys
      logger.error(
        "❌ JWT_PRIVATE_PEM provided without JWT_PUBLIC_PEM — refusing to start"
      );
      throw new Error("JWT_PUBLIC_PEM is required when JWT_PRIVATE_PEM is set");
    } else {
      // 🧪 Development-only fallback
      logger.warn("⚠️ Generating ephemeral JWT keys (development only)");

      const kp = await generateKeyPair("RS256", { modulusLength: 2048 });
      privateKey = kp.privateKey;
      publicKey = kp.publicKey;
      publicJwk = await exportJWK(publicKey);
    }

    if (!publicJwk) {
      throw new Error("Public JWK not initialized");
    }

    // JWK metadata
    publicJwk.alg = "RS256";
    publicJwk.use = "sig";
    publicJwk.kid = env.JWT_KID || publicJwk.kid || "dev-key";

    logger.info("✅ JWT keys initialized successfully");
  } catch (err) {
    logger.error({ err }, "❌ Failed to initialize JWT keys");
    throw err;
  }
}

export function getPublicJwks(): { keys: JWK[] } {
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
  if (!privateKey) {
    throw new Error("Private key not initialized");
  }

  return new SignJWT(payload)
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
  if (!publicKey) {
    throw new Error("Public key not initialized");
  }

  return jwtVerify(token, publicKey, {
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
  });
}
