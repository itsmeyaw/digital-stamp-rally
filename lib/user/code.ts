import { randomInt } from "node:crypto";

/**
 * Crockford-style alphabet for public User handles: A–Z + 2–9, excluding the
 * confusable characters I, L, O, U (and 0/1 which are not in the digit range 2–9).
 * 30 symbols total.
 */
export const CROCKFORD_ALPHABET = "ABCDEFGHJKMNPQRSTVWXYZ23456789";

export const CODE_LENGTH = 6;

/**
 * Generate a single random 6-character public handle. Uses crypto-grade
 * randomness. Uniqueness is enforced at persistence time (DB unique constraint
 * + retry), not here.
 */
export function generateCode(): string {
  let out = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += CROCKFORD_ALPHABET[randomInt(CROCKFORD_ALPHABET.length)];
  }
  return out;
}
