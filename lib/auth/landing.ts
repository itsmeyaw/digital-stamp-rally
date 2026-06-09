import type { TokenClaims } from "./token";

/**
 * Decide where to land an app-open based on the session (ADR-0001): the server
 * reads the role claim and routes. No valid session -> welcome. Users skip
 * welcome straight to their card.
 *
 * Staff destinations are wired here for forward-compatibility; their screens
 * arrive in later slices (#4+).
 */
export function resolveLanding(session: TokenClaims | null): string {
  if (!session) return "/welcome";
  switch (session.role) {
    case "user":
      return "/card";
    case "stamper":
      return "/scan";
    case "redeemer":
      return "/redeem";
    case "admin":
      return "/admin";
    default:
      return "/welcome";
  }
}
