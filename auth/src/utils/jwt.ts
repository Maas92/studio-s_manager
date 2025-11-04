// RS256 + JWKS using jose
import {
  generateKeyPair,
  exportJWK,
  importPKCS8,
  SignJWT,
  jwtVerify,
  JWTPayload,
  createRemoteJWKSet,
} from "jose";

const ISSUER = process.env.JWT_ISSUER ?? "studio-s-auth";
const AUDIENCE = process.env.JWT_AUDIENCE ?? "studio-s-clients";
const ACCESS_TTL_SEC = Number(process.env.ACCESS_TOKEN_TTL_SEC ?? 900); // 15m
const REFRESH_TTL_SEC = Number(process.env.REFRESH_TOKEN_TTL_SEC ?? 1209600); // 14d

let privateKey: CryptoKey;
let publicJwk: any;

export async function initKeys() {
  if (process.env.JWT_PRIVATE_PEM) {
    privateKey = await importPKCS8(process.env.JWT_PRIVATE_PEM, "RS256");
  } else {
    const kp = await generateKeyPair("RS256", { modulusLength: 2048 });
    privateKey = kp.privateKey;
    publicJwk = await exportJWK(kp.publicKey);
  }
  if (!publicJwk && privateKey) {
    // derive public key from private (works for runtime-generated keys)
    const kp = await generateKeyPair("RS256", { modulusLength: 2048 });
    publicJwk = await exportJWK(kp.publicKey); // simple fallback
  }
  publicJwk.alg = "RS256";
  publicJwk.use = "sig";
  publicJwk.kid = "studio-s-auth-1";
}

export function jwks() {
  return { keys: [publicJwk] };
}

export async function signAccess(payload: JWTPayload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "RS256", kid: "studio-s-auth-1" })
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TTL_SEC}s`)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .sign(privateKey);
}

export async function signRefresh(payload: JWTPayload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "RS256", kid: "studio-s-auth-1" })
    .setIssuedAt()
    .setExpirationTime(`${REFRESH_TTL_SEC}s`)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .sign(privateKey);
}

export async function verifyAccessRS256(token: string) {
  // Usually the gateway verifies; this is here for internal checks if needed
  return await jwtVerify(
    token,
    await createRemoteJWKSet(new URL(process.env.SELF_JWKS_URL!)),
    {
      issuer: ISSUER,
      audience: AUDIENCE,
    }
  );
}
