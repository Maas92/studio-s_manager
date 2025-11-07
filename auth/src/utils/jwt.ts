import {
  generateKeyPair,
  exportJWK,
  importPKCS8,
  SignJWT,
  jwtVerify,
  JWTPayload,
} from "jose";

const ISSUER = process.env.JWT_ISSUER ?? "studio-s-auth";
const AUDIENCE = process.env.JWT_AUDIENCE ?? "studio-s-clients";
const ACCESS_TTL_SEC = Number(process.env.ACCESS_TOKEN_TTL_SEC ?? 900); // 15m
const REFRESH_TTL_SEC = Number(process.env.REFRESH_TOKEN_TTL_SEC ?? 1209600); // 14d

let privateKey: CryptoKey;
let publicJwk: any;

export async function initKeys() {
  // If you provide a fixed private key (PKCS8 PEM) in env, we import it; otherwise generate at boot.
  if (process.env.JWT_PRIVATE_PEM) {
    privateKey = await importPKCS8(process.env.JWT_PRIVATE_PEM, "RS256");
  } else {
    const kp = await generateKeyPair("RS256", { modulusLength: 2048 });
    privateKey = kp.privateKey;
    publicJwk = await exportJWK(kp.publicKey);
  }
  if (!publicJwk) {
    // If you imported a private key but don't have the public PEM/JWK, generate a one-time pair for JWKS exposure.
    const kp = await generateKeyPair("RS256", { modulusLength: 2048 });
    publicJwk = await exportJWK(kp.publicKey);
  }
  publicJwk.alg = "RS256";
  publicJwk.use = "sig";
  publicJwk.kid = process.env.JWT_KID ?? "studio-s-auth-1";
}

export function jwks() {
  return { keys: [publicJwk] };
}

export async function signAccess(payload: JWTPayload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "RS256", kid: publicJwk.kid })
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TTL_SEC}s`)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .sign(privateKey);
}

export async function signRefresh(payload: JWTPayload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "RS256", kid: publicJwk.kid })
    .setIssuedAt()
    .setExpirationTime(`${REFRESH_TTL_SEC}s`)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .sign(privateKey);
}

// Optional: verify locally for your own protected routes (gateway also verifies)
export async function verifyAccess(token: string) {
  return await jwtVerify(token, privateKey, {
    issuer: ISSUER,
    audience: AUDIENCE,
  });
}
