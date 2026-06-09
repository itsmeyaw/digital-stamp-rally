import type { Database } from "@/lib/db/client";
import { users, type User } from "@/lib/db/schema";
import { generateCode } from "./code";

const MAX_ATTEMPTS = 8;

/** Postgres unique-violation SQLSTATE. */
function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "23505"
  );
}

/**
 * Mint a new User: generate a candidate 6-char public handle and insert it,
 * relying on the `users.code` UNIQUE constraint to detect collisions. On a
 * collision we retry with a fresh code (vanishingly unlikely at event scale,
 * but correct). Returns the persisted row.
 */
export async function createUser(db: Database): Promise<User> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const code = generateCode();
    try {
      const [row] = await db.insert(users).values({ code }).returning();
      return row;
    } catch (err) {
      lastErr = err;
      if (isUniqueViolation(err)) continue;
      throw err;
    }
  }
  throw new Error(
    `createUser: exhausted ${MAX_ATTEMPTS} attempts to mint a unique code`,
    { cause: lastErr },
  );
}
