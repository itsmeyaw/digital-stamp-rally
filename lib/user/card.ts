import { eq, inArray } from "drizzle-orm";
import type { Database } from "@/lib/db/client";
import { grants, stamps } from "@/lib/db/schema";
import {
  deriveCard,
  type Grant as DomainGrant,
  type StampState,
} from "@/lib/domain/card";

/** The card always shows exactly 5 Slots (CONTEXT.md "Slot"). */
export const SLOT_COUNT = 5;

/** Rich per-slot data returned to the client for rendering with StampCard. */
export interface SlotData {
  name: string;
  imageUrl: string;
  bgColor: string;
  textColor: string;
}

/** Card result with enriched slot data for client rendering. */
export interface CardResult {
  activeStamps: string[];
  slots: (SlotData | null)[];
  complete: boolean;
  bonusCount: number;
}

/**
 * Fetch all grants and stamp states for a user, derive their card, and enrich
 * filled slots with full stamp data (name, imageUrl, bgColor, textColor).
 *
 * The domain module `deriveCard` is kept pure (returns stamp IDs). Enrichment
 * happens here after the domain call by looking up stamp details.
 */
export async function getCard(db: Database, userId: string): Promise<CardResult> {
  // Load all stamps for StampState (including inactive, to correctly compute active-only)
  const allStamps = await db.select().from(stamps);
  const stampStates: StampState[] = allStamps.map((s) => ({
    stampId: s.id,
    active: s.active,
  }));

  // Build a lookup map for stamp details (id -> stamp row)
  const stampById = new Map(allStamps.map((s) => [s.id, s]));

  // Load all grants for this user
  const userGrants = await db
    .select()
    .from(grants)
    .where(eq(grants.userId, userId));
  const domainGrants: DomainGrant[] = userGrants.map((g) => ({
    stampId: g.stampId,
    acquiredAt: g.acquiredAt,
  }));

  const derived = deriveCard(domainGrants, stampStates);

  // Enrich slots: replace stamp IDs with SlotData objects (or keep null)
  const enrichedSlots: (SlotData | null)[] = derived.slots.map((stampId) => {
    if (stampId === null) return null;
    const stamp = stampById.get(stampId);
    if (!stamp) return null;
    return {
      name: stamp.name,
      imageUrl: stamp.imageUrl,
      bgColor: stamp.bgColor,
      textColor: stamp.textColor,
    };
  });

  return {
    activeStamps: derived.activeStamps,
    slots: enrichedSlots,
    complete: derived.complete,
    bonusCount: derived.bonusCount,
  };
}
