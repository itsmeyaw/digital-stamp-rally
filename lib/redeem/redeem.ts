/**
 * Redeem domain module (issue #10).
 *
 * Provides two operations:
 *
 * - `lookupUser(db, userCode)` — look up a User by their 6-char code and
 *   compute their redemption status. Status is derived from durable DB records
 *   (Completion, Redemption), NOT from the live card count, so a User who
 *   completed but later had a Stamp revoked/deactivated still shows as eligible.
 *
 * - `redeemUser(db, userCode)` — attempt an at-most-once prize redemption for a
 *   User. Requires a Completion row to exist. Writes a Redemption row using
 *   INSERT … ON CONFLICT DO NOTHING for write-once safety.
 */
import { eq } from "drizzle-orm";
import type { Database } from "@/lib/db/client";
import { completions, redemptions } from "@/lib/db/schema";
import { getUserByCode } from "@/lib/user/get-user";
import { getCard } from "@/lib/user/card";
import type { CardResult } from "@/lib/domain/card";

// ──────────────────────────────────────────────────────────────────────────────
// Error

export type RedeemErrorCode = "user_not_found" | "not_completed";

export class RedeemError extends Error {
  constructor(public readonly code: RedeemErrorCode) {
    super(code);
    this.name = "RedeemError";
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Types

export type RedeemStatus = "eligible" | "blocked" | "already_redeemed";

export interface LookupResult {
  status: RedeemStatus;
  activeStampCount: number;
  completionExists: boolean;
  redemptionExists: boolean;
  card: CardResult;
}

// ──────────────────────────────────────────────────────────────────────────────
// lookupUser

/**
 * Look up a User by their 6-char code and return their current redemption
 * status.
 *
 * Status logic (derived from durable records, not live card count):
 *   - "already_redeemed" if a Redemption row exists for the User.
 *   - "eligible"         if a Completion row exists (and no Redemption).
 *   - "blocked"          otherwise (no Completion row).
 *
 * Throws `RedeemError("user_not_found")` if the code is unknown.
 */
export async function lookupUser(
  db: Database,
  userCode: string,
): Promise<LookupResult> {
  const user = await getUserByCode(db, userCode);
  if (!user) throw new RedeemError("user_not_found");

  const [completionRow] = await db
    .select()
    .from(completions)
    .where(eq(completions.userId, user.id))
    .limit(1);

  const [redemptionRow] = await db
    .select()
    .from(redemptions)
    .where(eq(redemptions.userId, user.id))
    .limit(1);

  const completionExists = completionRow !== undefined;
  const redemptionExists = redemptionRow !== undefined;

  let status: RedeemStatus;
  if (redemptionExists) {
    status = "already_redeemed";
  } else if (completionExists) {
    status = "eligible";
  } else {
    status = "blocked";
  }

  const card = await getCard(db, user.id);

  return {
    status,
    activeStampCount: card.activeStamps.length,
    completionExists,
    redemptionExists,
    card,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// redeemUser

export interface RedeemResult {
  /** True if a Redemption row was freshly written in this call. */
  redeemed: boolean;
  /** True if the User was already redeemed before this call. */
  alreadyRedeemed: boolean;
}

/**
 * Attempt a write-once prize redemption for a User identified by 6-char code.
 *
 * - If the User has a Completion and no existing Redemption, inserts a
 *   Redemption row (INSERT … ON CONFLICT DO NOTHING) and returns
 *   `{ redeemed: true, alreadyRedeemed: false }`.
 * - If the User already has a Redemption, returns
 *   `{ redeemed: false, alreadyRedeemed: true }` — idempotent.
 * - If the User has no Completion, throws `RedeemError("not_completed")`.
 * - If the code is unknown, throws `RedeemError("user_not_found")`.
 */
export async function redeemUser(
  db: Database,
  userCode: string,
): Promise<RedeemResult> {
  const user = await getUserByCode(db, userCode);
  if (!user) throw new RedeemError("user_not_found");

  // Check for existing Completion (eligibility gate)
  const [completionRow] = await db
    .select()
    .from(completions)
    .where(eq(completions.userId, user.id))
    .limit(1);

  if (!completionRow) {
    throw new RedeemError("not_completed");
  }

  // Check for existing Redemption (idempotency check before write)
  const [existingRedemption] = await db
    .select()
    .from(redemptions)
    .where(eq(redemptions.userId, user.id))
    .limit(1);

  if (existingRedemption) {
    return { redeemed: false, alreadyRedeemed: true };
  }

  // Write Redemption (at-most-once via ON CONFLICT DO NOTHING)
  await db
    .insert(redemptions)
    .values({ userId: user.id })
    .onConflictDoNothing();

  // Confirm whether this call actually inserted a fresh row
  const [confirmedRedemption] = await db
    .select()
    .from(redemptions)
    .where(eq(redemptions.userId, user.id))
    .limit(1);

  // If another concurrent request raced us and the row existed, return alreadyRedeemed
  if (!confirmedRedemption) {
    // Extremely unlikely; treat as if already redeemed
    return { redeemed: false, alreadyRedeemed: true };
  }

  return { redeemed: true, alreadyRedeemed: false };
}
