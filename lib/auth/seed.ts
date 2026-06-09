import { eq } from "drizzle-orm";
import type { Database } from "@/lib/db/client";
import { staff, type Staff } from "@/lib/db/schema";
import { hashPassword } from "./password";

/**
 * Seed the first Administrator from deploy-provided credentials, avoiding the
 * chicken-and-egg lockout where no one can create the first admin (issue #4).
 *
 * Idempotent and safe to re-run at every deploy: if a staff row with the given
 * username already exists, it is returned unchanged (the password is NOT
 * reset). Only when absent do we hash the password and insert a new admin.
 *
 * Env-reading is intentionally kept OUT of this function (see
 * scripts/seed-admin.ts) so the seed logic is unit-testable against the
 * ephemeral test harness.
 */
export async function seedAdmin(
  db: Database,
  creds: { username: string; password: string },
): Promise<Staff> {
  const existing = await db
    .select()
    .from(staff)
    .where(eq(staff.username, creds.username))
    .limit(1);
  if (existing[0]) return existing[0];

  const passwordHash = await hashPassword(creds.password);
  const [row] = await db
    .insert(staff)
    .values({ username: creds.username, passwordHash, role: "admin" })
    .returning();
  return row;
}
