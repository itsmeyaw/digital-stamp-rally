import { eq } from "drizzle-orm";
import type { Database } from "@/lib/db/client";
import { staff, type Staff } from "@/lib/db/schema";

/** Look up a staff account by its unique username, or null if none exists. */
export async function getStaffByUsername(
  db: Database,
  username: string,
): Promise<Staff | null> {
  const rows = await db
    .select()
    .from(staff)
    .where(eq(staff.username, username))
    .limit(1);
  return rows[0] ?? null;
}
