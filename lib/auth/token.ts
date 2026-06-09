import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Stateless, HMAC-SHA256-signed session token. Format:
 *
 *   base64url(JSON payload) + "." + base64url(HMAC-SHA256(payload, secret))
 *
 * The payload carries the User's id (`sub`), their `role`, and issued-at /
 * expiry timestamps (seconds since epoch). The token is the only secret that
 * authenticates a User; the public 6-char handle does NOT appear here and does
 * not grant access (see ADR-0001).
 */

export type Role = "user" | "stamper" | "redeemer" | "admin";

export interface TokenClaims {
  /** Subject — the authenticated principal's id (User id for role "user"). */
  sub: string;
  role: Role;
  /** Issued-at, seconds since epoch. */
  iat: number;
  /** Expiry, seconds since epoch. */
  exp: number;
}

export interface SignOptions {
  secret: string;
  /** Token lifetime in seconds. */
  ttlSeconds: number;
  /** Override "now" (seconds since epoch) — for testing. */
  now?: number;
}

export interface VerifyOptions {
  secret: string;
  /** Override "now" (seconds since epoch) — for testing. */
  now?: number;
}

function base64urlEncode(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function hmac(payloadB64: string, secret: string): Buffer {
  return createHmac("sha256", secret).update(payloadB64).digest();
}

export function signToken(
  claims: { sub: string; role: Role },
  opts: SignOptions,
): string {
  const iat = opts.now ?? Math.floor(Date.now() / 1000);
  const exp = iat + opts.ttlSeconds;
  const full: TokenClaims = { sub: claims.sub, role: claims.role, iat, exp };
  const payloadB64 = base64urlEncode(JSON.stringify(full));
  const sigB64 = base64urlEncode(hmac(payloadB64, opts.secret));
  return `${payloadB64}.${sigB64}`;
}

/**
 * Verify a token's signature and expiry. Returns the claims on success, or
 * `null` if the token is malformed, tampered, or expired. Never throws on
 * untrusted input.
 */
export function verifyToken(
  token: string,
  opts: VerifyOptions,
): TokenClaims | null {
  if (typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, sigB64] = parts;
  if (!payloadB64 || !sigB64) return null;

  const expectedSig = hmac(payloadB64, opts.secret);
  let providedSig: Buffer;
  try {
    providedSig = Buffer.from(sigB64, "base64url");
  } catch {
    return null;
  }
  if (
    providedSig.length !== expectedSig.length ||
    !timingSafeEqual(providedSig, expectedSig)
  ) {
    return null;
  }

  let claims: TokenClaims;
  try {
    claims = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (
    typeof claims?.sub !== "string" ||
    typeof claims?.role !== "string" ||
    typeof claims?.iat !== "number" ||
    typeof claims?.exp !== "number"
  ) {
    return null;
  }

  const now = opts.now ?? Math.floor(Date.now() / 1000);
  if (now >= claims.exp) return null;

  return claims;
}
