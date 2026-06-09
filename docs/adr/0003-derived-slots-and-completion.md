# 3. Slots and completion are derived, not stored

Date: 2026-06-09

## Status

Accepted

## Context

A User's card shows 5 Slots. We need rules for: filling Slots in collection order
("earliest free slot"), allowing collection beyond 5 (bonus stamps), rejecting duplicate
designs, admin **revocation** of a mistaken grant, and retroactive **deactivation** of a
Stamp (which must remove it from every card and stop it counting toward progress).

The naive design stores a fixed slot index per grant. That makes revoke/deactivate painful:
you must decide whether to leave gaps, renumber, or backfill, and keep a "complete" flag in
sync. We chose compact-left behaviour (no gaps), which a stored-position model fights.

## Decision

Store only the underlying facts: each grant is a record of `(user, stamp, acquired_at)`,
with a uniqueness constraint preventing a User from holding the same Stamp twice. Everything
the card shows is **derived** at read time:

- **Slot position** = index of the Stamp within the User's currently-held **active** Stamps,
  ordered by `acquired_at`. The Nth such Stamp renders in the Nth Slot.
- **Complete** = the User holds ≥ 5 distinct active Stamps. It is a computed state, never a
  stored flag.
- Bonus Stamps (6th onward) are simply records beyond the first five in the ordering.
- Revocation deletes/marks a grant record; deactivation flips the Stamp's active flag.
  Remaining Stamps re-derive their positions automatically (compact-left, no gaps).

## Consequences

- Revoke and retroactive deactivation require no slot bookkeeping — positions and Complete
  recompute from the same query. This is the main payoff.
- "Earliest free slot", "ordering matters", "no duplicates", "collect beyond 5", and
  "deactivated stamps vanish and stop counting" all fall out of one ordered, filtered query.
- The card can change under a user when an Admin revokes/deactivates (a stamp shifts left or
  a bonus stamp slides into view). This is intended and surfaced via the card's polling.
- Slightly more compute per card render vs reading a stored layout — negligible at the
  expected scale (<100 users).
- "Complete" cannot be relied on as a permanent achievement. Prize redemption *is* needed,
  so completion is captured as a separate durable event — see ADR-0004.
