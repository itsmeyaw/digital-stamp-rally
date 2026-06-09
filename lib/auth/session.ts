import { cookies } from "next/headers";
import {
  signToken,
  verifyToken,
  type Role,
  type TokenClaims,
} from "./token";
import { sessionSecret, sessionTtlSeconds } from "@/lib/env";

/**
 * Session = the bearer credential delivered as a long-lived httpOnly cookie
 * (ADR-0001). The cookie value is the HMAC-signed token from ./token. The
 * public 6-char handle never appears here and never authenticates.
 */
export const SESSION_COOKIE_NAME = "dsr_session";

export interface SessionCookie {
  name: typeof SESSION_COOKIE_NAME;
  value: string;
  options: {
    httpOnly: true;
    secure: boolean;
    sameSite: "lax";
    path: "/";
    maxAge: number;
  };
}

/** Build the session cookie (name + signed value + attributes) for a principal. */
export function buildSessionCookie(principal: {
  sub: string;
  role: Role;
}): SessionCookie {
  const ttl = sessionTtlSeconds();
  const value = signToken(principal, {
    secret: sessionSecret(),
    ttlSeconds: ttl,
  });
  return {
    name: SESSION_COOKIE_NAME,
    value,
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: ttl,
    },
  };
}

/** Verify a raw cookie value into claims, or null. Pure; no request context. */
export function readSession(
  cookieValue: string | undefined | null,
): TokenClaims | null {
  if (!cookieValue) return null;
  return verifyToken(cookieValue, { secret: sessionSecret() });
}

/**
 * Read the current request's session from the httpOnly cookie. Returns the
 * verified claims, or null if there is no valid session. This is the public
 * entry point route handlers and pages use (`getSession()`).
 */
export async function getSession(): Promise<TokenClaims | null> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE_NAME)?.value;
  return readSession(raw);
}
