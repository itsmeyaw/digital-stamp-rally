import type { TokenClaims } from "./token";

export type DeepLinkRouteInput = {
  session: TokenClaims | null;
  /** Already normalized (uppercase, trimmed) by the caller. */
  code: string;
  /** Only meaningful when session.role === "stamper". */
  stamperHasBoundStamp: boolean;
};

/**
 * Pure routing function for the /s/[code] deep-link route.
 *
 * Returns a redirect destination string, or the sentinel "degraded" when a
 * stamper has no active bound stamp (page renders an inline error instead of
 * redirecting).
 *
 * Callers must normalize `code` (trim + uppercase) before passing it in.
 * This function never performs I/O.
 */
export function resolveDeepLink(
  input: DeepLinkRouteInput,
): string | "degraded" {
  const { session, code, stamperHasBoundStamp } = input;

  if (!session) {
    return `/login?returnTo=/s/${code}`;
  }

  switch (session.role) {
    case "user":
      return "/card";
    case "stamper":
      return stamperHasBoundStamp ? `/scan?code=${code}` : "degraded";
    case "redeemer":
      return `/redeem?code=${code}`;
    case "admin":
      return `/redeem?code=${code}`;
    default:
      return `/login?returnTo=/s/${code}`;
  }
}
