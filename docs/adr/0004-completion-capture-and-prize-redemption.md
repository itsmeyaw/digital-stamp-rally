# 4. Capture completion durably; redeem prizes via a Redeemer role

Date: 2026-06-09

## Status

Accepted

## Context

The event awards a Prize for completing the rally. ADR-0003 made the "Complete" condition
*derived and transient* — revoking or deactivating a Stamp can drop a User back below 5
active Stamps. That is correct for the card display, but a prize cannot be allowed to
silently un-earn itself after a participant has been told they won.

We also needed an authority to hand out prizes. The "three mutually exclusive roles"
foundation (User, Stamper, Admin) had no notion of a prize booth, and prize staff are
usually distinct from stamp booths.

## Decision

Separate the transient condition from the durable achievement, and add a fourth role:

- **Complete** stays as defined in ADR-0003: the live, derived "holds ≥5 active Stamps"
  condition that drives the card. It is not stored.
- **Completion** is a durable, timestamped record captured the **first instant** a User
  becomes Complete. Once captured it is **permanent** and never withdrawn, even if the User
  later drops below 5 active Stamps. Completion — not Complete — entitles a User to a Prize.
- **Redemption** is a separate one-time flag marking the Prize handed out. A User can be
  redeemed at most once. Redemption is **blocked** unless the User has a Completion;
  attempting to redeem a non-completed User fails and reports current progress (e.g. "3/5").
- **Redeemer** is a new role, structurally a sibling of Stamper: Admin-created, username +
  password auth, same QR-scan (+ manual 6-char) flow. On scan it shows the User's Completion
  and Redemption status and offers a redeem action when eligible. Admins may also redeem.
  Roles are now four and remain mutually exclusive.

## Consequences

- A won prize can never be un-earned by a later revoke/deactivation — fair to participants
  and robust to admin corrections mid-event.
- The card model from ADR-0003 is untouched; it keeps re-deriving freely. Completion is an
  additive, write-once record layered on top.
- Capturing Completion requires a check at every grant: "did this grant just push the User
  to ≥5 active Stamps for the first time?" If so, write the Completion record.
- Two distinct states to track per User: has-Completion and has-Redemption. The redeem flow
  must guard against double-redemption (the at-most-once rule).
- Adding a fourth role expands auth/routing slightly (a Redeemer landing screen, role claim
  value) but reuses the Stamper scan UI almost entirely.
- Edge case made explicit: a User can hold a Completion yet currently show <5 on their card
  (a stamp was later revoked). Staff-facing screens should show Completion status, not just
  the live card count, to avoid confusion at the prize booth.
