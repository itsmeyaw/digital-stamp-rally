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

/**
 * Deploy credentials for the first Administrator, consumed by the seed step
 * (scripts/seed-admin.ts -> seedAdmin). Required only when running the seed;
 * read lazily so the rest of the app never needs them set.
 */
export function adminUsername(): string {
  return required("ADMIN_USERNAME");
}

/** Plaintext password for the seeded first Administrator (hashed on seed). */
export function adminPassword(): string {
  return required("ADMIN_PASSWORD");
}

/**
 * Maximum accepted Stamp image size in bytes. Defaults to 2 MiB. Configurable
 * via STAMP_IMAGE_MAX_BYTES so the limit can be tuned per deploy without code
 * changes (ADR-0002 stores the image in Blob; this caps upload cost/abuse).
 */
export function stampImageMaxBytes(): number {
  const raw = process.env.STAMP_IMAGE_MAX_BYTES;
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 2 * 1024 * 1024;
}

/**
 * Allowed MIME types for a Stamp image. Defaults to PNG/JPEG/WebP. Configurable
 * via STAMP_IMAGE_ALLOWED_TYPES (comma-separated) for deploy-time flexibility.
 */
export function stampImageAllowedTypes(): string[] {
  const raw = process.env.STAMP_IMAGE_ALLOWED_TYPES;
  if (raw) {
    const parsed = raw
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    if (parsed.length > 0) return parsed;
  }
  return ["image/png", "image/jpeg", "image/webp"];
}
