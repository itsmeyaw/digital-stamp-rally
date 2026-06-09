import type { Role, TokenClaims } from "./token";

/**
 * Authorization guard: does this session hold the required role? Roles are
 * mutually exclusive (CONTEXT.md "Roles"), so this is an exact match. A null
 * session (no/invalid cookie) is never authorized.
 *
 * This is the checkable seam route handlers and pages use to enforce
 * "a Stamper cannot reach admin endpoints" (issue #4). Returns a boolean so
 * callers decide the response (403 for API, redirect for pages).
 */
export function requireRole(
  session: TokenClaims | null,
  role: Role,
): boolean {
  return session?.role === role;
}
