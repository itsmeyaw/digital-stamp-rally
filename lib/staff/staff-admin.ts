import { eq, desc, inArray } from "drizzle-orm";
import type { Database } from "@/lib/db/client";
import { staff, stamps, type Staff } from "@/lib/db/schema";
import { hashPassword } from "@/lib/auth/password";

/**
 * Staff-management domain (issue #6). An Administrator creates and maintains
 * Stamper and Redeemer accounts here; these functions take the Drizzle handle so
 * they are testable against the ephemeral harness and reusable from route
 * handlers. Failures are returned as a typed `StaffAdminError` (never thrown for
 * expected, caller-mappable conditions) so route handlers can map them to HTTP
 * status codes without string-matching.
 *
 * Invariants enforced here:
 * - A Stamper is bound to EXACTLY one existing Stamp at creation.
 * - Usernames are unique across all staff.
 * - Staff are deactivated (active=false), never hard-deleted.
 */

/** Caller-mappable failure reasons for staff-management operations. */
export type StaffAdminErrorCode =
  | "username_taken"
  | "stamp_not_found"
  | "staff_not_found"
  | "not_a_stamper";

export class StaffAdminError extends Error {
  constructor(public readonly code: StaffAdminErrorCode) {
    super(code);
    this.name = "StaffAdminError";
  }
}

async function usernameExists(db: Database, username: string): Promise<boolean> {
  const rows = await db
    .select({ id: staff.id })
    .from(staff)
    .where(eq(staff.username, username))
    .limit(1);
  return rows.length > 0;
}

async function stampExists(db: Database, stampId: string): Promise<boolean> {
  const rows = await db
    .select({ id: stamps.id })
    .from(stamps)
    .where(eq(stamps.id, stampId))
    .limit(1);
  return rows.length > 0;
}

/**
 * Create a Stamper bound to exactly one existing Stamp. Rejects a duplicate
 * username (`username_taken`) or a missing/unknown stamp (`stamp_not_found`).
 * The plaintext password is hashed; the account starts active.
 */
export async function createStamper(
  db: Database,
  input: { username: string; password: string; stampId: string },
): Promise<Staff> {
  if (await usernameExists(db, input.username)) {
    throw new StaffAdminError("username_taken");
  }
  if (!input.stampId || !(await stampExists(db, input.stampId))) {
    throw new StaffAdminError("stamp_not_found");
  }
  const passwordHash = await hashPassword(input.password);
  const [row] = await db
    .insert(staff)
    .values({
      username: input.username,
      passwordHash,
      role: "stamper",
      stampId: input.stampId,
    })
    .returning();
  return row;
}

/**
 * Create a Redeemer — same as a Stamper but with NO Stamp binding (stampId
 * stays null). Rejects a duplicate username (`username_taken`).
 */
export async function createRedeemer(
  db: Database,
  input: { username: string; password: string },
): Promise<Staff> {
  if (await usernameExists(db, input.username)) {
    throw new StaffAdminError("username_taken");
  }
  const passwordHash = await hashPassword(input.password);
  const [row] = await db
    .insert(staff)
    .values({
      username: input.username,
      passwordHash,
      role: "redeemer",
    })
    .returning();
  return row;
}

/**
 * Re-assign which Stamp a Stamper is bound to (one at a time, #6). Rejects an
 * unknown staff id (`staff_not_found`), a non-Stamper target (`not_a_stamper`),
 * or a missing/unknown target stamp (`stamp_not_found`).
 */
export async function reassignStamperStamp(
  db: Database,
  input: { staffId: string; stampId: string },
): Promise<Staff> {
  const [target] = await db
    .select()
    .from(staff)
    .where(eq(staff.id, input.staffId))
    .limit(1);
  if (!target) throw new StaffAdminError("staff_not_found");
  if (target.role !== "stamper") throw new StaffAdminError("not_a_stamper");
  if (!input.stampId || !(await stampExists(db, input.stampId))) {
    throw new StaffAdminError("stamp_not_found");
  }

  const [row] = await db
    .update(staff)
    .set({ stampId: input.stampId })
    .where(eq(staff.id, input.staffId))
    .returning();
  return row;
}

/**
 * Deactivate a staff account (#6): flips `active` to false so the account can no
 * longer log in / grant / redeem. The row is NEVER deleted — history is always
 * preserved. Rejects an unknown staff id (`staff_not_found`).
 */
export async function deactivateStaff(
  db: Database,
  input: { staffId: string },
): Promise<Staff> {
  const [row] = await db
    .update(staff)
    .set({ active: false })
    .where(eq(staff.id, input.staffId))
    .returning();
  if (!row) throw new StaffAdminError("staff_not_found");
  return row;
}

/**
 * List the manageable staff accounts (Stampers and Redeemers) for the admin
 * dashboard, newest first. Admins are excluded — they are not managed here.
 * Deactivated accounts are still listed (history is preserved).
 */
export async function listStaff(db: Database): Promise<Staff[]> {
  return db
    .select()
    .from(staff)
    .where(inArray(staff.role, ["stamper", "redeemer"]))
    .orderBy(desc(staff.createdAt));
}
