# Digital Stamp Rally — Context

A glossary of the ubiquitous language for this project. This file is a glossary only —
no implementation details, no specs, no decisions (those live in `docs/adr/`).

## Terms

### Stamp
A distinct collectible design offered during the event. Each Stamp has a unique square
image. The event offers **more than 5** distinct Stamps. A Stamp is **active** or
**deactivated**:
- Active Stamps are grantable and count toward a User's progress.
- Deactivating a Stamp is **retroactive**: it is no longer grantable AND it disappears
  from every card that held it, no longer counting toward Complete. Stamps are never hard
  deleted (history is preserved in the data even though hidden from cards).

### Slot
One of the **5** display positions on a User's collection card. A Slot is not stored; it
is derived. The card shows the User's currently-held **active** Stamps ordered by
acquisition time — the Nth such Stamp appears in the Nth Slot. When a Stamp is revoked or
deactivated, later Stamps shift left to keep filled Slots contiguous (no gaps). A newly
collected Stamp always appears in the earliest free Slot.

### Collection
The full ordered record of distinct Stamps a User has acquired. A User holds each distinct
Stamp at most once (duplicates are rejected). Collection continues beyond 5 — the card
displays only 5 Slots, but every acquired Stamp is recorded.

### Complete
The live, derived condition of holding at least 5 distinct **active** Stamps (all 5 Slots
filled). Stamps held beyond the 5th are bonus. This condition is transient — revocation or
deactivation can drop a User out of it. It drives the card display only.

### Completion
A **durable, timestamped achievement** captured the first instant a User becomes Complete.
Once captured, a Completion is permanent: it stands even if the User later drops below 5
active Stamps. Completion — not the live Complete condition — is what entitles a User to a
Prize.

### Prize
A physical reward a User is entitled to once they have a Completion. A Prize is handed out
exactly once, tracked by a **Redemption**.

### Redemption
The act of marking a User's Prize as handed out, performed by a Redeemer (or Admin). A User
may be redeemed at most once. Redemption is blocked unless the User has a Completion;
attempting to redeem a non-completed User fails with their current progress (e.g. "3/5").

### User
A participant who collects Stamps. A User does not sign up; on first "collect" they are
issued a unique **6-character public identifier** and a separate **bearer credential**
(server-signed token) stored on their device.

- The 6-character ID is a **public handle** — it appears in the User's QR and is read by
  Stampers to grant Stamps. It does not authenticate.
- The bearer credential is the **secret** that proves "I am this User" to the server for
  User-side actions (e.g. viewing their card).
- There is **no recovery**: losing the device credential means starting over as a new
  User. (An Admin may still grant Stamps to any existing User by their 6-char ID.)

### Stamper
An authenticated account bound to exactly one Stamp. Scanning a User's QR (or entering
their 6-char ID) grants that one Stamp to the User. The binding is set by an Admin at
creation and can be re-assigned later (one Stamp at a time). Multiple Stampers may be bound
to the same Stamp design (e.g. two booths giving the "Coffee" stamp). Stampers can be
deactivated (can no longer grant) but are not hard deleted. Authenticates with
username + password.

### Administrator
An authenticated account that can grant any Stamp to any User, create Stamps, add
Stampers, and assign Stamps to Stampers. Authenticates with username + password.

### Redeemer
An authenticated account that hands out Prizes. Structurally a sibling of Stamper: created
by an Admin, authenticates with username + password, and uses the same QR-scan (+ manual
6-char) flow. Instead of granting a Stamp, scanning a User shows the User's Completion and
Redemption status (e.g. "5/5 — eligible", "3/5 — blocked", or "already redeemed") and
offers a redeem action when eligible. Redeemers can be deactivated, not hard deleted.

### Roles
User, Stamper, Redeemer, and Administrator are mutually exclusive roles. An Admin can also
perform Redemptions.
