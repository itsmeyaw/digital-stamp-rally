# 7. User QR as a POST-gated, role-adaptive deep link

Date: 2026-06-09

## Status

Accepted

## Context

Until now the User's QR encoded only their bare 6-character public handle (ADR-0001).
Staff granted or redeemed by pointing an **in-browser camera** (`getUserMedia`) at that QR
on the `/scan` and `/redeem` screens, or by typing the 6 chars manually. The in-browser
camera is fragile: it needs camera permission inside the booth's browser, a live `<video>`
decode loop, and a QR-reading library, and it fails quietly on locked-down or older mobile
browsers.

Phones already ship a reliable QR reader: the **native camera app**. If the QR encoded a
URL instead of a bare code, a Stamper could scan with their phone's camera, the OS would
open the link, and the booth's already-authenticated browser session would carry the action
— no in-browser camera at all.

Turning the QR into a URL raises three questions that are costly to get wrong:

1. **What does opening the URL *do*?** Opening a URL is an HTTP **GET**, and GETs are fired
   speculatively — by native-camera link previews, chat-app unfurlers, and prefetchers. A
   URL that grants on GET would let a stamp (or a redemption) fire without anyone confirming.
2. **Who is the URL for?** ADR-0001/0004 established a single User QR read by both Stampers
   (to grant) and Redeemers/Admins (to redeem). One QR must serve every staff role.
3. **What carries the identity of the action?** The QR is on the *User's* device; the action
   runs in *whoever's* browser opens it. The booth phone's logged-in session — not the QR —
   decides which Stamp is granted (unchanged from ADR-0001).

## Decision

The User's QR encodes a **deep-link URL** to a terse, role-adaptive router path; the QR
payload becomes `${NEXT_PUBLIC_BASE_URL}/s/{CODE}` (e.g. `https://app.example/s/ABC123`).
The path is deliberately short to keep QR density low.

- **`/s/[code]` is a thin role-router, not a mutation.** On GET it checks the visitor's
  session and `redirect()`s — it never grants or redeems:
  - **Stamper** → `/scan?code=CODE` (grant-confirm screen, pre-filled)
  - **Redeemer / Admin** → `/redeem?code=CODE` (redeem-status screen, pre-filled)
  - **User** (the QR's owner tapping their own card) → `/card`
  - **Logged-out** → `/login?returnTo=/s/CODE`, returning to the scan target after login
- **Mutations stay POST behind a confirm button.** The grant (`POST /api/grant`) and the
  redeem (`POST /api/redeem`) only fire when staff tap a button on the destination screen.
  GET is navigation-only. A redeem *lookup* (`GET /api/redeem?code=`) may auto-run on mount
  because it is a safe, idempotent read; only the redeem mutation waits for the tap.
- **The in-browser camera is removed.** `/scan` and `/redeem` drop `getUserMedia`, the
  `<video>` element, and the QR-decode loop. **Manual 6-character entry remains** as the
  fallback for an unreadable User screen.
- **Account-level blockers fail early; per-user errors fail late.** `/s/[code]` screens out
  Stamper-account problems (no bound Stamp, deactivated Stamp) before redirecting, reusing
  the existing degraded screen. Only a bad/unknown user code surfaces after the tap.
- **Ordering avoids leaks.** The session check runs *before* code validation, so an
  anonymous visitor hitting `/s/garbage` is sent to login (or `/card` if a User) and never
  learns whether a code is valid.
- **`returnTo` is open-redirect-guarded.** Login only honors `returnTo` when it is a
  same-origin *relative* path (rejects `//`, `/\`, and absolute URLs), else falls back to
  the role landing. Validation runs in the `login` server component; `/api/login` is
  unchanged.

## Consequences

- Booths scan with the native camera app — no in-browser camera permission, no decode loop,
  far fewer device-compatibility failures. The trade-off: each booth phone must be **logged
  in as its Stamper** in its default browser, since the deep link opens into that session.
- The "grant many users from one screen" loop and its session tally go away — each grant is
  a fresh native scan opening a new page. The result screen just shows the outcome and a
  "scan next" hint.
- A new security invariant future code must preserve: **GET on `/s/[code]` (and any QR
  target) must never mutate.** Collapsing the redirect + POST into a one-shot GET grant would
  reintroduce the prefetch/preview-grant vulnerability.
- A new required env var, `NEXT_PUBLIC_BASE_URL`, must be set in **every** environment that
  renders the card (dev, test, CI, preview, prod) or `/card` throws. The QR needs an
  absolute origin; a bare or relative payload cannot be resolved by a native camera app.
- The domain language is unchanged — this alters the QR *payload*, not the model. CONTEXT.md
  needs no edit. ADR-0001's "the QR is public and a scan only adds a Stamp" reasoning still
  holds: the link is harmless to leak because the mutation is POST-gated and auth-scoped.
- `/scan` (server component, reads `searchParams`) and `/redeem` (client component, reads
  `useSearchParams`) pre-fill `?code=` differently, but share the confirm/result UI so there
  is one source of truth per action.
