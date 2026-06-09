# 2. Store Stamp images in Vercel Blob

Date: 2026-06-09

## Status

Accepted

## Context

Administrators create Stamps at runtime, and each Stamp has a unique square image that the
Admin provides. The app is hosted on Vercel, whose serverless filesystem is read-only at
runtime — uploaded files cannot be written to disk. We needed a place to put images that:
- supports runtime upload (so "Admin creates a Stamp" is a real in-app action, not a deploy),
- serves images reliably during the event,
- integrates cleanly with Vercel hosting.

Alternatives considered: bundling images in `/public` (would make stamp creation a code
deploy), and pasting external image URLs (depends on a third-party host staying up during
the event).

## Decision

Admins upload a square image when creating a Stamp. Images are stored in **Vercel Blob**;
the resulting URL is saved on the Stamp row in Postgres.

## Consequences

- Stamp creation is a true runtime admin action, no deploy required.
- Native to the Vercel platform; one fewer external dependency than a separate object store.
- Adds Vercel Blob as a piece of infrastructure to provision and a (small) cost line.
- Couples image hosting to Vercel; migrating off Vercel later would require moving blobs and
  rewriting stored URLs. Acceptable trade-off for a Vercel-hosted one-day event.
- Image validation (square aspect, size/type limits) becomes the app's responsibility at
  upload time.
