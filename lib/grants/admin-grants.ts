/**
 * Admin grant/revoke domain module (issue #8).
 *
 * `adminGrantStamp` grants an explicit Stamp (by id) to a User (by 6-char code).
 * Same transaction semantics as grantStamp in grant.ts but does NOT look up a
 * bound stamper — it uses the explicit stampId.
 *
 * `adminRevokeStamp` removes a grant and returns the updated card. Compact-left
 * falls out naturally from deriveCard.
 *
 * Errors are `AdminGrantError` with `.code`:
 *   user_not_found | stamp_not_found | stamp_inactive
 */
import { eq, and } from "drizzle-orm";
import type { Database } from "@/lib/db/client";
import { stamps, grants, completions } from "@/lib/db/schema";
import { getUserByCode } from "@/lib/user/get-user";
import {
  deriveCard,
  crossesCompletion,
  type Grant as DomainGrant,
  type StampState,
  type CardResult,
} from "@/lib/domain/card";
import type { GrantResult } from "./grant";

// ──────────────────────────────────────────────────────────────────────────────
// Error

export type AdminGrantErrorCode =
  | "user_not_found"
  | "stamp_not_found"
  | "stamp_inactive";

export class AdminGrantError extends Error {
  constructor(public readonly code: AdminGrantErrorCode) {
    super(code);
    this.name = "AdminGrantError";
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Revoke result

export interface RevokeResult {
  /** True if a grant row was actually deleted. */
  revoked: boolean;
  /** The User's card derived AFTER this operation. */
  card: CardResult;
}

// ──────────────────────────────────────────────────────────────────────────────
// Helpers

/** Convert a DB unique-violation (SQLSTATE 23505) to a boolean. */
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
// Core: adminGrantStamp

export async function adminGrantStamp(
  db: Database,
  { stampId, userCode }: { stampId: string; userCode: string },
): Promise<GrantResult> {
  // 1. Look up user by code
  const user = await getUserByCode(db, userCode);
  if (!user) throw new AdminGrantError("user_not_found");

  // 2. Look up stamp by id
  const [stampRow] = await db
    .select()
    .from(stamps)
    .where(eq(stamps.id, stampId))
    .limit(1);
  if (!stampRow) throw new AdminGrantError("stamp_not_found");
  if (!stampRow.active) throw new AdminGrantError("stamp_inactive");

  // 3. Load all stamps (for StampState) and existing grants for this user
  const allStamps = await db.select().from(stamps);
  const stampStates: StampState[] = allStamps.map((s) => ({
    stampId: s.id,
    active: s.active,
  }));

  const existingGrants = await db
    .select()
    .from(grants)
    .where(eq(grants.userId, user.id));
  const beforeGrants: DomainGrant[] = existingGrants.map((g) => ({
    stampId: g.stampId,
    acquiredAt: g.acquiredAt,
  }));

  // 4. Insert grant, optionally insert completion
  let alreadyHad = false;
  let completionCaptured = false;
  let acquiredAt = new Date();

  try {
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
    const afterGrants: DomainGrant[] = [
      ...beforeGrants,
      { stampId, acquiredAt },
    ];

    if (crossesCompletion(beforeGrants, afterGrants, stampStates)) {
      try {
        await db.insert(completions).values({ userId: user.id });
        completionCaptured = true;
      } catch (err) {
        if (!isUniqueViolation(err)) throw err;
        // Already existed — no-op
      }
    }
  }

  // 5. Derive the resulting card
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

// ──────────────────────────────────────────────────────────────────────────────
// Core: adminRevokeStamp

export async function adminRevokeStamp(
  db: Database,
  { stampId, userCode }: { stampId: string; userCode: string },
): Promise<RevokeResult> {
  // 1. Look up user by code
  const user = await getUserByCode(db, userCode);
  if (!user) throw new AdminGrantError("user_not_found");

  // 2. Look up stamp by id (for validation)
  const [stampRow] = await db
    .select()
    .from(stamps)
    .where(eq(stamps.id, stampId))
    .limit(1);
  if (!stampRow) throw new AdminGrantError("stamp_not_found");

  // 3. Delete the grant row
  const deleted = await db
    .delete(grants)
    .where(and(eq(grants.userId, user.id), eq(grants.stampId, stampId)))
    .returning();

  const revoked = deleted.length > 0;

  // 4. Derive post-revoke card
  const allStamps = await db.select().from(stamps);
  const stampStates: StampState[] = allStamps.map((s) => ({
    stampId: s.id,
    active: s.active,
  }));

  const currentGrants = await db
    .select()
    .from(grants)
    .where(eq(grants.userId, user.id));
  const currentDomainGrants: DomainGrant[] = currentGrants.map((g) => ({
    stampId: g.stampId,
    acquiredAt: g.acquiredAt,
  }));

  const card = deriveCard(currentDomainGrants, stampStates);

  return { revoked, card };
}
