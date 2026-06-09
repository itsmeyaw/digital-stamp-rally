/**
 * Returns `returnTo` if it is a safe same-origin relative path,
 * otherwise returns `fallback`.
 *
 * Rejects: absolute URLs (http://, https://), protocol-relative (//),
 * backslash tricks (/\), null/undefined/empty, non-string values.
 */
export function sanitizeReturnTo(
  returnTo: string | null | undefined,
  fallback: string,
): string {
  if (!returnTo || typeof returnTo !== "string") return fallback;
  // Must not be empty
  if (returnTo.length === 0) return fallback;
  // Must not be absolute URL (any scheme with ://)
  if (returnTo.includes("://")) return fallback;
  // Must not be protocol-relative
  if (returnTo.startsWith("//")) return fallback;
  // Must start with exactly one /
  if (!returnTo.startsWith("/")) return fallback;
  // Must not use backslash trick
  if (returnTo.startsWith("/\\")) return fallback;

  return returnTo;
}
