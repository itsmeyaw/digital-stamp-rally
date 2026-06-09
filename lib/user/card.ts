import type { TokenClaims } from "@/lib/auth/token";

/** The card always shows exactly 5 Slots (CONTEXT.md "Slot"). */
export const SLOT_COUNT = 5;

/**
 * A held Stamp occupying a Slot. In this foundation slice no Stamps exist yet,
 * so a Slot is always empty (`null`). Later slices (issue #7+) replace `null`
 * with the held Stamp's details, derived per ADR-0003.
 */
export type Slot = null;

export interface Card {
  /** Exactly SLOT_COUNT entries, compact-left; `null` = empty Slot. */
  slots: Slot[];
  /** Derived Complete state: holding >= 5 distinct active Stamps. */
  complete: boolean;
  /** Stamps held beyond the 5th. */
  bonusCount: number;
}

/**
 * Derive the card view for a session. Slots and Complete are computed, never
 * stored (ADR-0003). A user with no Stamps gets 5 empty Slots.
 *
 * Foundation slice: there are no Stamps yet, so this always returns the empty
 * card. The signature (session in, derived card out) is the seam issue #7 fills
 * with a real grants query.
 */
export function getCard(_session: TokenClaims): Card {
  void _session;
  return {
    slots: Array.from({ length: SLOT_COUNT }, () => null),
    complete: false,
    bonusCount: 0,
  };
}
