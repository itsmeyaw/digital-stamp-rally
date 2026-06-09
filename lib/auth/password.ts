import bcrypt from "bcryptjs";

/**
 * Password hashing for staff accounts. Staff authenticate with username +
 * password (CONTEXT.md); only the hash is ever persisted (lib/db/schema staff
 * table). We use bcrypt (via the pure-JS `bcryptjs`) so there is no native
 * build to fight the serverless/CI build-gate. The algorithm is intentionally
 * wrapped here so it can be swapped without touching call sites.
 */

/** bcrypt work factor. 10 is a reasonable default for a one-day event. */
const SALT_ROUNDS = 10;

/** Hash a plaintext password for storage. */
export function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, SALT_ROUNDS);
}

/** Verify a plaintext password against a stored hash. Never throws. */
export function verifyPassword(
  plaintext: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plaintext, hash);
}
