# 1. User identity via bearer credential, no signup, no recovery

Date: 2026-06-09

## Status

Accepted

## Context

Users (the people collecting stamps) must not sign up. They need an identity that:
- is created instantly on first "collect",
- survives page refresh and browser restart,
- can be presented to a Stamper so a Stamp can be granted to the right person,
- carries no PII for a casual one-day event.

A complication: the thing a Stamper reads (the User's identifier, shown in a QR code) is
inherently public, so it cannot also be the secret that authenticates the User. We also
needed to decide how much account-recovery machinery to build for a one-day event.

Stampers and Administrators authenticate with username + password, but should share the
same session mechanism so "refresh doesn't log out" holds uniformly.

## Decision

Separate **public identity** from **secret credential** for Users:

- On first "collect", the server mints a unique **6-character public ID** (Crockford-style
  alphabet: A–Z + 2–9, excluding confusable characters) and a **server-signed token**.
- The token is delivered as a **long-lived httpOnly cookie** (valid for the event window,
  ~24h+). It is the only secret proving "I am this User". JavaScript never reads it.
- The 6-character ID is public: it is encoded in the User's QR and read by Stampers to
  grant a Stamp. It does not authenticate.
- The **same cookie/token mechanism** carries the role (user / stamper / admin) for all
  three mutually-exclusive roles. On app open the server reads the role claim and routes:
  user → card, stamper → scan screen, admin → dashboard, none → welcome.
- **No recovery.** Losing the device credential means starting over as a new User. (An
  Admin can still grant Stamps to any existing User by their 6-char ID.)

## Consequences

- Zero PII, no signup friction, instant onboarding — fits a casual one-day event.
- Refresh/restart safe because the credential lives in a persistent httpOnly cookie.
- Because the QR/ID is public and a scan only *adds* a Stamp to the scanned User, grant-path
  impersonation is harmless (worst case: you gift someone a Stamp). No anti-replay needed
  on QR codes. The only credential-protected action is owning/viewing a card.
- Clearing browser data or switching phones loses the collection permanently. Acceptable
  given the event's low stakes; Admin re-granting is the only mitigation.
- A single token format spanning all roles keeps the auth surface small but means role is
  fixed at issue time (consistent with mutually-exclusive roles).
