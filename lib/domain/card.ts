export type StampId = string;

export interface Grant {
  stampId: StampId;
  acquiredAt: Date;
}

export interface StampState {
  stampId: StampId;
  active: boolean;
}

export const SLOT_COUNT = 5;

export interface CardResult {
  activeStamps: StampId[];
  slots: (StampId | null)[];
  complete: boolean;
  bonusCount: number;
}

/**
 * Compute the ordered list of currently-held ACTIVE stamp ids for a user.
 *
 * Pure helper shared by deriveCard and crossesCompletion. The ordering is by
 * acquisition time ascending; ties broken by stampId for determinism. Only
 * stamps whose state is active count. Duplicate grants of the same stamp are
 * collapsed to the earliest acquisition (the Collection holds each distinct
 * stamp at most once — ADR-0003).
 */
function orderedActiveStamps(
  grants: Grant[],
  stampStates: StampState[],
): StampId[] {
  const activeIds = new Set(
    stampStates.filter((s) => s.active).map((s) => s.stampId),
  );

  // Collapse duplicates to the earliest acquisition per distinct stamp.
  const earliest = new Map<StampId, Date>();
  for (const grant of grants) {
    if (!activeIds.has(grant.stampId)) continue;
    const existing = earliest.get(grant.stampId);
    if (existing === undefined || grant.acquiredAt < existing) {
      earliest.set(grant.stampId, grant.acquiredAt);
    }
  }

  return [...earliest.entries()]
    .sort((a, b) => {
      const byTime = a[1].getTime() - b[1].getTime();
      if (byTime !== 0) return byTime;
      return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0;
    })
    .map(([stampId]) => stampId);
}

export function deriveCard(
  grants: Grant[],
  stampStates: StampState[],
): CardResult {
  const activeStamps = orderedActiveStamps(grants, stampStates);

  const slots: (StampId | null)[] = [];
  for (let i = 0; i < SLOT_COUNT; i++) {
    slots.push(activeStamps[i] ?? null);
  }

  const complete = activeStamps.length >= SLOT_COUNT;
  const bonusCount = Math.max(0, activeStamps.length - SLOT_COUNT);

  return { activeStamps, slots, complete, bonusCount };
}

/**
 * Pure predicate: does the transition from `before` to `after` (evaluated
 * against the same `stampStates`) cross the live Complete threshold for the
 * FIRST time within this single transition?
 *
 * Returns true iff `before` is NOT complete (<5 distinct active stamps) AND
 * `after` IS complete (>=5 distinct active stamps).
 *
 * This is the ONLY write-trigger for a durable Completion (ADR-0004). It is a
 * snapshot predicate over two grant sets, so #7 can compute it inside a grant
 * transaction: pass the pre-grant grants as `before` and the post-grant grants
 * as `after`.
 *
 * Re-crossing semantics: Completion is durable and write-once (ADR-0004), but
 * THIS function has no memory — it only compares the two snapshots it is given.
 * On a re-cross (e.g. 5 active -> a stamp is revoked/deactivated dropping to 4
 * -> later re-granted back to 5) the predicate returns true AGAIN, because
 * `before` (4) is not complete and `after` (5) is. The "captured the FIRST
 * instant" guarantee is therefore enforced by the CONSUMER: the caller must
 * only write a Completion when one does not already exist for the User. This
 * keeps the domain pure and stateless while letting the persistence layer hold
 * the write-once invariant.
 */
export function crossesCompletion(
  before: Grant[],
  after: Grant[],
  stampStates: StampState[],
): boolean {
  const wasComplete =
    orderedActiveStamps(before, stampStates).length >= SLOT_COUNT;
  const isComplete =
    orderedActiveStamps(after, stampStates).length >= SLOT_COUNT;
  return !wasComplete && isComplete;
}
