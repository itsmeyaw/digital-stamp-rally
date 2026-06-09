import { eq } from "drizzle-orm";
import type { Database } from "@/lib/db/client";
import { users, type User } from "@/lib/db/schema";

/** Look up a User by internal id (the session token's `sub`). */
export async function getUserById(
  db: Database,
  id: string,
): Promise<User | null> {
  const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return row ?? null;
}

/** Look up a User by their 6-character public code (displayed on QR). */
export async function getUserByCode(
  db: Database,
  code: string,
): Promise<User | null> {
  const [row] = await db
    .select()
    .from(users)
    .where(eq(users.code, code))
    .limit(1);
  return row ?? null;
}
