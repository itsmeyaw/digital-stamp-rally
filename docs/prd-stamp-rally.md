## Problem Statement

We are running a one-day stamp rally event. Participants move between booths collecting
stamps, and we want a paperless way for them to do it on their phones — no app install, no
signup, no personal data. Booth staff need a fast, reliable way to give a stamp to the right
participant, organizers need to create stamps and manage staff on the day, and a prize booth
needs to hand out prizes to people who completed the rally without giving the same prize
twice. The classic paper-card version loses cards, can't prevent forgery or double-prizes,
and gives organizers no live view.

## Solution

A mobile-first web app (Next.js on Vercel, Postgres) with four mutually-exclusive roles:

- **User** — taps "Collect", instantly gets a card with 5 Slots and a QR code. No signup.
- **Stamper** — logs in, taps to open a camera, scans a User's QR (or types their 6-char
  code), and grants the one Stamp their booth is bound to.
- **Redeemer** — logs in, scans a User, sees whether they completed the rally, and hands
  out the prize exactly once.
- **Administrator** — creates Stamps (with uploaded images), creates/assigns/deactivates
  Stampers and Redeemers, and can grant or revoke any Stamp for any User.

A User's card shows the first 5 distinct stamps they collect; they may keep collecting past
5 as bonus. The instant a User holds 5 distinct active stamps, their **Completion** is
captured permanently — it entitles them to a prize even if a stamp is later revoked. Refresh
never logs anyone out.

This PRD respects the project glossary (`CONTEXT.md`) and ADRs 0001–0004.

## User Stories

**Visitor / onboarding**

1. As a first-time visitor, I want a welcome screen titled "Welcome to {Event Name} Stamp Rally", so that I know I'm in the right place.
2. As a first-time visitor, I want to choose between "Collect stamp" and "Login", so that I can pick the path that matches who I am.
3. As a first-time visitor who taps "Collect stamp", I want a brief intro explaining how the rally works before my card is created, so that I understand what to do at booths.
4. As a first-time visitor, I want a User created for me automatically after the intro, so that I can start collecting without signing up.
5. As a new User, I want to be issued a unique 6-character code, so that booth staff can identify me.
6. As a new User, I want my credential saved on my device, so that I stay logged in.
7. As a returning User, I want to skip the welcome screen and land directly on my card, so that I don't repeat onboarding.

**User — collecting & viewing the card**

8. As a User, I want to see 5 Slots on my card, so that I know how many stamps complete the rally.
9. As a User, I want my QR code shown on my card, so that a Stamper can scan me.
10. As a User, I want my 6-character code shown near my QR, so that staff can use it if scanning fails.
11. As a User, I want each newly collected Stamp to appear in the earliest free Slot, so that my progress fills in order.
12. As a User, I want my card to update within a few seconds of being stamped without me doing anything, so that I see the stamp appear while standing at the booth.
13. As a User, I want a refresh or closing/reopening my browser to keep me logged in, so that I never lose access to my card during the day.
14. As a User, I want to keep collecting stamps beyond 5, so that visiting extra booths still feels rewarding (bonus stamps).
15. As a User, I want the same stamp design to be rejected if I already have it, so that duplicates don't waste my slots.
16. As a User, I want to see when I've completed the rally (all 5 Slots filled), so that I know I can claim a prize.
17. As a User who completed the rally, I want my completed status to stay even if an organizer later removes a stamp, so that I don't lose a prize I already earned.

**Stamper**

18. As a Stamper, I want to log in with a username and password, so that only authorized booth staff can grant stamps.
19. As a Stamper, I want to stay logged in across refreshes, so that I don't re-authenticate all day.
20. As a Stamper, I want to land on a screen showing which Stamp I give, so that I'm confident I'm granting the right one.
21. As a Stamper, I want the camera to start only when I tap a button, so that my phone battery isn't drained while idle.
22. As a Stamper, I want to scan a User's QR to grant my Stamp, so that stamping is fast.
23. As a Stamper, I want to type a User's 6-character code as a fallback, so that I can still stamp when scanning fails.
24. As a Stamper, I want clear confirmation after a grant ("Granted ✓") plus the User's resulting state (e.g. "3/5", or "already had this stamp"), so that I know the scan worked.
25. As a Stamper, I want a running tally of how many stamps I've granted, so that I can gauge booth activity.
26. As a Stamper, I want a duplicate grant to be reported as a harmless no-op, so that re-scanning someone doesn't error or double-count.

**Redeemer**

27. As a Redeemer, I want to log in with a username and password, so that only prize-booth staff can redeem.
28. As a Redeemer, I want to scan a User's QR or type their 6-character code, so that I can look them up quickly.
29. As a Redeemer, I want to see whether the scanned User completed the rally (e.g. "5/5 — eligible" or "3/5 — blocked"), so that I only give prizes to those who earned them.
30. As a Redeemer, I want to see whether a User has already redeemed, so that I don't hand out a second prize.
31. As a Redeemer, I want a redeem action that's only enabled when the User is eligible and not yet redeemed, so that I can't make a mistake.
32. As a Redeemer, I want redemption to be blocked for a non-completed User with their progress shown, so that I can tell them how many stamps they still need.
33. As a Redeemer, I want to rely on the User's Completion record rather than their live card count, so that someone who completed but later had a stamp removed still gets their prize.

**Administrator — stamps**

34. As an Administrator, I want to create a Stamp by uploading a square image and giving it a name, so that booths have stamps to give.
35. As an Administrator, I want the image validated as square within size/type limits, so that cards render consistently.
36. As an Administrator, I want to deactivate a Stamp, so that it stops being grantable and is removed from progress when we retire it.
37. As an Administrator, I want deactivation to be retroactive (the stamp disappears from every card and stops counting), so that a mistaken or retired stamp doesn't inflate progress.
38. As an Administrator, I want stamps to never be hard-deleted, so that history is preserved.

**Administrator — stampers & redeemers**

39. As an Administrator, I want to create a Stamper account with a username and password, so that booth staff can log in.
40. As an Administrator, I want to bind a Stamper to exactly one Stamp at creation, so that scanning grants the correct stamp.
41. As an Administrator, I want to re-assign which Stamp a Stamper is bound to, so that a booth can switch what it gives during the day.
42. As an Administrator, I want multiple Stampers bound to the same Stamp design, so that several booths can give the same stamp.
43. As an Administrator, I want to deactivate a Stamper, so that a retired booth can no longer grant.
44. As an Administrator, I want to create and deactivate Redeemer accounts the same way as Stampers, so that prize-booth staff can be managed.

**Administrator — users, grants, corrections**

45. As an Administrator, I want to grant any Stamp to any User by their 6-character code, so that I can fix missed stamps.
46. As an Administrator, I want to revoke a Stamp from a User, so that I can correct a mis-scan.
47. As an Administrator, I want revoking a middle stamp to compact the remaining stamps left (no gaps), so that the card stays tidy.
48. As an Administrator, I want a sectioned dashboard (Stamps, Stampers, Redeemers, Users/grants), so that I can find management tasks quickly.
49. As an Administrator, I want to be able to perform redemptions too, so that I can cover the prize booth if needed.

**Cross-cutting**

50. As any staff member, I want my role to determine where I land after login (Stamper → scan screen, Redeemer → scan screen, Admin → dashboard), so that I go straight to my job.
51. As an organizer, I want the very first Administrator created by a seed step at deploy, so that there's no chicken-and-egg lockout.
52. As an organizer, I want the event name configured at deploy, so that the welcome screen shows our event.
53. As any User, I want my public 6-character code not to grant anyone access to my session, so that someone seeing my screen can't impersonate me — they can at worst gift me a stamp.

## Implementation Decisions

**Stack & hosting**
- Next.js 16 (App Router) + React 19 + Tailwind v4, deployed on Vercel. Postgres as the
  database. Stamp images stored in Vercel Blob (ADR-0002).
- **Database access**: use a typed query layer (recommend Drizzle ORM) with SQL migrations
  checked into the repo. Rationale: TS-native, serverless-friendly, and migrations give the
  seed step (story 51) a home. (Confirm at implementation time; this is the one stack choice
  not previously settled.)
- Connection handling must suit Vercel serverless + Postgres (pooled connection / driver
  suitable for serverless). Scale target is small (<100 concurrent), so no special tuning.

**Auth & session (ADR-0001)**
- One server-signed token format spanning all roles, carrying a role claim
  (`user | stamper | redeemer | admin`) and the subject identifier. Delivered as a
  **long-lived httpOnly cookie** valid for the event window (~24h+).
- A single `getSession()`-style accessor reads and verifies the cookie server-side; route
  handlers and pages branch on the role claim. App-open routing: valid user → card,
  stamper/redeemer → scan screen, admin → dashboard, none → welcome.
- User credential is bearer-only; **no recovery**. 6-character ID is a public handle
  (Crockford alphabet: A–Z + 2–9 minus confusables), minted with uniqueness check + retry.
- Stamper/Redeemer/Admin passwords stored hashed (e.g. argon2/bcrypt). First Admin created
  by a **seed step** run at deploy from env-provided credentials.

**Domain module — derived card & completion (ADR-0003, ADR-0004)**
- A pure module computes, from a User's grant records and the active/inactive state of each
  Stamp: the ordered list of held active Stamps, the 5 Slot positions (Nth active held
  stamp → Nth slot, compact-left), the live **Complete** condition (≥5 distinct active),
  and whether a given grant **first crosses** the threshold.
- Underlying data is `(user, stamp, acquired_at)` grant records with a uniqueness constraint
  preventing the same User holding the same Stamp twice. Slots/Complete are never stored.
- **Completion** is a durable, write-once, timestamped record captured the first instant a
  User reaches Complete. It is never withdrawn (survives later revoke/deactivate).
- **Redemption** is a separate write-once flag per User; allowed only if a Completion exists;
  enforced at-most-once.

**Stamp grant flow**
- Granting endpoint identifies the User by 6-char code (from scanned QR or manual entry),
  identifies the Stamp from the authenticated Stamper's binding (Stampers cannot choose a
  stamp), inserts a grant if not duplicate, and — in the same transaction — evaluates and
  writes a Completion if this grant first crosses 5. Returns the User's resulting progress
  and a duplicate/no-op indicator for stamper feedback.
- Admin grant uses the same path but takes an explicit Stamp + User code.

**Card live update**
- The User card polls a read endpoint every ~3–5s (no websockets). Endpoint returns the
  derived slots and Complete state for the authenticated User.

**Stamp lifecycle**
- Deactivation is a flag flip; it is retroactive by virtue of the derived card filtering on
  active stamps. No data is deleted.

**Module/route surface (interfaces, not file paths)**
- Auth: `login(role-bearing credential) → sets cookie`, `logout()`, `getSession()`.
- User: `createUser() → {code, cookie}`, `getCard(session) → {slots, complete, bonusCount}`.
- Grant: `grantByCode({stamperSession, userCode}) → {progress, duplicate}`,
  `adminGrant({stampId, userCode})`, `adminRevoke({stampId, userCode})`.
- Stamp admin: `createStamp({name, image})`, `deactivateStamp(id)`, `listStamps()`.
- Staff admin: `createStaff({role, username, password, stampId?})`,
  `reassignStamperStamp({stamperId, stampId})`, `deactivateStaff(id)`.
- Redeem: `lookupForRedeem({redeemerSession, userCode}) → {complete, completedAt, redeemed}`,
  `redeem({userCode}) → {ok} | {blocked, progress}`.
- Pure domain: `deriveCard(grants, stampStates)`, `crossesCompletion(before, after)`.

## Testing Decisions

Good tests here assert **external behavior** through the seams, not internals: given a
request and DB state, assert the response and the resulting DB state. They do not assert how
slots are computed internally, only what the card/endpoints return. Tests use the
**manual 6-character code path** to exercise grant/redeem logic (no camera automation).

**Runner**: Vitest (+ @testing-library/react only where a component genuinely needs it).

**Three seams (highest preferred):**

1. **Route handlers / server actions (primary).** Run against an ephemeral real Postgres
   (Testcontainers-style or a dedicated disposable test database) with migrations applied.
   Cover the behavioral rules:
   - collect → new user issued a unique 6-char code + session cookie;
   - grant by code adds a stamp; duplicate design grant is a no-op reported as such;
   - card endpoint returns stamps in acquisition order, earliest-free-slot fill;
   - collecting beyond 5 records bonus without changing Complete;
   - reaching 5 captures a Completion exactly once; a second crossing does not duplicate it;
   - admin revoke compacts left; deactivating a stamp removes it from cards and progress
     retroactively;
   - Completion survives a post-completion revoke/deactivate (still eligible to redeem);
   - redeem blocked unless Completion exists, returns progress when blocked;
   - redeem succeeds once and is rejected on a second attempt;
   - stamper is bound to one stamp and cannot grant another;
   - role-based routing/authorization (e.g. a stamper cannot hit admin endpoints).

2. **Pure domain module (unit).** Fast, no DB. Combinatorial edge cases for
   `deriveCard`/`crossesCompletion`: empty, partial, exactly 5, beyond 5, revoke-from-middle,
   deactivation mid-set, duplicate rejection ordering, and the first-crossing predicate.

3. **Auth/session (unit).** Token mint → verify round-trips: correct role/subject claims,
   tampered/expired tokens rejected, cookie attributes (httpOnly) set.

**Prior art**: none in this fresh repo — these establish the patterns. The route-level
ephemeral-Postgres harness is the reference other slices should follow.

No browser/E2E tests in scope (camera QR scanning is out; the manual-code path covers the
same domain logic).

## Out of Scope

- Offline tolerance / PWA sync — venue assumed reliably online (design session).
- Self-service or admin account recovery for Users — no recovery by design (ADR-0001).
- Real-time push (websockets/SSE) — polling is sufficient at this scale.
- Enforced event start/end time gating — event window is descriptive only.
- Admin-editable branding/settings UI — event name comes from deploy config.
- QR-camera automated testing and browser E2E.
- Multi-event / multi-tenant support — single event per deployment.
- Anti-replay on QR codes — unnecessary since grant-path impersonation is harmless
  (public handle adds a stamp only; ADR-0001).
- Stamper self-undo of grants — only Admin revokes.
- Internationalization, analytics dashboards, and prize inventory tracking beyond the
  redeemed flag.

## Further Notes

- The four roles are mutually exclusive (`CONTEXT.md`). Redeemer was added during the design
  session and is structurally a sibling of Stamper (ADR-0004).
- A subtle but important booth-facing rule: a User can hold a Completion yet show <5 on their
  live card (a stamp was revoked after completing). Redeemer screens must surface Completion
  status, not the live card count.
- The only write-logic the otherwise-derived model needs is the per-grant "did this first
  cross 5?" check that writes the Completion record.
- Glossary terms used here are defined in `CONTEXT.md`: Stamp, Slot, Collection, Complete,
  Completion, Prize, Redemption, User, Stamper, Redeemer, Administrator.
