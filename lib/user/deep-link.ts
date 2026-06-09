/**
 * Builds the deep-link URL that is encoded into the user's QR code.
 * The URL resolves to the scan/collect page pre-targeted at the user.
 *
 * @param base  - Base URL of the app (NEXT_PUBLIC_BASE_URL). Any trailing
 *                slash is stripped before the path is appended.
 * @param code  - The user's unique 6-character identifier.
 */
export function buildDeepLinkUrl(base: string, code: string): string {
  return `${base.replace(/\/$/, "")}/s/${code}`;
}
