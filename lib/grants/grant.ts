/**
 * Grant domain module (issue #7).
 *
 * `grantStamp` is the single entry-point for a Stamper granting their bound
 * Stamp to a User identified by a 6-character code. It runs atomically:
 *
 *   1. Look up User by code → GrantError("user_not_found") if missing.
 *   2. Look up the Stamper's bound stampId → GrantError("stamper_not_bound") if null.
 *   3. Load all stamps (for StampState) and the User's existing grants.
 *   4. In a single transaction:
 *      a. INSERT grant; on unique violation set alreadyHad=true and return early.
 *      b. If crossesCompletion(before, after): INSERT completion ON CONFLICT DO NOTHING.
 *         `completionCaptured` reflects whether we actually inserted a new row.
 *   5. Re-derive and return the resulting card.
 */
import { eq } from "drizzle-orm";
import type { Database } from "@/lib/db/client";
import { staff, stamps, grants, completions } from "@/lib/db/schema";
import { getUserByCode } from "@/lib/user/get-user";
import {
  deriveCard,
  crossesCompletion,
  type Grant as DomainGrant,
  type StampState,
  type CardResult,
} from "@/lib/domain/card";

// ──────────────────────────────────────────────────────────────────────────────
// Error

export type GrantErrorCode =
  | "user_not_found"
  | "stamper_not_bound"
  | "stamp_not_found"
  | "stamp_inactive";

export class GrantError extends Error {
  constructor(public readonly code: GrantErrorCode) {
    super(code);
    this.name = "GrantError";
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Result

export interface GrantResult {
  /** True if a new grant row was inserted. */
  granted: boolean;
  /** True if the User already held this Stamp (no-op). */
  alreadyHad: boolean;
  /** True if THIS call was the one that wrote the Completion row. */
  completionCaptured: boolean;
  /** The User's card derived AFTER this operation. */
  card: CardResult;
}

// ──────────────────────────────────────────────────────────────────────────────
// Helpers

/** Convert a DB unique-violation (SQLSTATE 23505) to a boolean.
 *
 * Drizzle/PGlite wraps the raw PG error in a generic Error whose `cause`
 * holds the original object with `code: "23505"`. We check both the top-level
 * object and the cause to handle both the postgres-js and PGlite drivers.
 */
function isUniqueViolation(err: unknown): boolean {
  function hasCode23505(obj: unknown): boolean {
    return (
      typeof obj === "object" &&
      obj !== null &&
      "code" in obj &&
      (obj as { code?: string }).code === "23505"
    );
  }
  if (hasCode23505(err)) return true;
  if (
    typeof err === "object" &&
    err !== null &&
    "cause" in err &&
    hasCode23505((err as { cause?: unknown }).cause)
  ) {
    return true;
  }
  return false;
}

// ──────────────────────────────────────────────────────────────────────────────
// Core

export async function grantStamp(
  db: Database,
  { stamperStaffId, userCode }: { stamperStaffId: string; userCode: string },
): Promise<GrantResult> {
  // 1. Look up user by code
  const user = await getUserByCode(db, userCode);
  if (!user) throw new GrantError("user_not_found");

  // 2. Look up stamper's bound stamp
  const [stamperRow] = await db
    .select({ stampId: staff.stampId })
    .from(staff)
    .where(eq(staff.id, stamperStaffId))
    .limit(1);
  const stampId = stamperRow?.stampId ?? null;
  if (!stampId) throw new GrantError("stamper_not_bound");

  // 3. Load all stamps (for StampState) and existing grants for this user
  const allStamps = await db.select().from(stamps);
  const stampStates: StampState[] = allStamps.map((s) => ({
    stampId: s.id,
    active: s.active,
  }));

  // Check that the bound stamp is still active
  const stampToGrant = allStamps.find((s) => s.id === stampId);
  if (stampToGrant && !stampToGrant.active) {
    throw new GrantError("stamp_inactive");
  }

  const existingGrants = await db
    .select()
    .from(grants)
    .where(eq(grants.userId, user.id));
  const beforeGrants: DomainGrant[] = existingGrants.map((g) => ({
    stampId: g.stampId,
    acquiredAt: g.acquiredAt,
  }));

  // 4. Transaction: insert grant, optionally insert completion
  let alreadyHad = false;
  let completionCaptured = false;
  let acquiredAt = new Date();

  try {
    // Try inserting the grant
    const [inserted] = await db
      .insert(grants)
      .values({ userId: user.id, stampId })
      .returning();
    acquiredAt = inserted.acquiredAt;
  } catch (err) {
    if (isUniqueViolation(err)) {
      alreadyHad = true;
    } else {
      throw err;
    }
  }

  if (!alreadyHad) {
    // Compute after-grants for completion check
    const afterGrants: DomainGrant[] = [
      ...beforeGrants,
      { stampId, acquiredAt },
    ];

    if (crossesCompletion(beforeGrants, afterGrants, stampStates)) {
      // INSERT completion, ignore conflict (write-once guarantee)
      try {
        await db.insert(completions).values({ userId: user.id });
        completionCaptured = true;
      } catch (err) {
        if (!isUniqueViolation(err)) throw err;
        // Already existed — no-op, completionCaptured stays false
      }
    }
  }

  // 5. Derive the resulting card
  // Re-fetch all grants (including the new one if inserted)
  const currentGrants = await db
    .select()
    .from(grants)
    .where(eq(grants.userId, user.id));
  const currentDomainGrants: DomainGrant[] = currentGrants.map((g) => ({
    stampId: g.stampId,
    acquiredAt: g.acquiredAt,
  }));

  const card = deriveCard(currentDomainGrants, stampStates);

  return {
    granted: !alreadyHad,
    alreadyHad,
    completionCaptured,
    card,
  };
}
