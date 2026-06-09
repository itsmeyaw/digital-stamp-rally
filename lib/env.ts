/**
 * Centralised deploy-time configuration. Reading happens lazily so that tests
 * and tooling can set env vars before first use, and so a missing var fails
 * loudly at the call site rather than at import time.
 */

function required(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v;
}

/** Postgres connection string. */
export function databaseUrl(): string {
  return required("DATABASE_URL");
}

/** Secret used to sign session tokens (HMAC-SHA256). */
export function sessionSecret(): string {
  return required("SESSION_SECRET");
}

/** Event name shown on the welcome screen. Falls back to a generic label. */
export function eventName(): string {
  return process.env.EVENT_NAME ?? "the Event";
}

/** Session lifetime in seconds. Long-lived (default ~30 days) per ADR-0001. */
export function sessionTtlSeconds(): number {
  const raw = process.env.SESSION_TTL_SECONDS;
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 60 * 60 * 24 * 30;
}
