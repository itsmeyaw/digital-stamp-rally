import { eq } from "drizzle-orm";
import type { Database } from "@/lib/db/client";
import { grants, stamps } from "@/lib/db/schema";
import {
  deriveCard,
  type CardResult,
  type Grant as DomainGrant,
  type StampState,
} from "@/lib/domain/card";

/** The card always shows exactly 5 Slots (CONTEXT.md "Slot"). */
export const SLOT_COUNT = 5;

/**
 * Fetch all grants and stamp states for a user and derive their card.
 * Replaces the empty-slots stub from the foundation slice (issue #7).
 */
export async function getCard(db: Database, userId: string): Promise<CardResult> {
  // Load all stamps for StampState (including inactive, to correctly compute active-only)
  const allStamps = await db.select().from(stamps);
  const stampStates: StampState[] = allStamps.map((s) => ({
    stampId: s.id,
    active: s.active,
  }));

  // Load all grants for this user
  const userGrants = await db
    .select()
    .from(grants)
    .where(eq(grants.userId, userId));
  const domainGrants: DomainGrant[] = userGrants.map((g) => ({
    stampId: g.stampId,
    acquiredAt: g.acquiredAt,
  }));

  return deriveCard(domainGrants, stampStates);
}
