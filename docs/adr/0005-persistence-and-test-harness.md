# 5. Drizzle ORM on serverless Postgres, with an ephemeral-DB test harness

Date: 2026-06-09

## Status

Accepted

## Context

The walking-skeleton slice (issue #2) introduces the first database access and needs a
persistence layer plus a migration toolchain that suits Vercel serverless + Postgres. It
also sets the precedent for how route-handler tests run against a real database — every
later slice reuses this harness, so it must be clean, reusable, and runnable without
fragile external setup.

Route-handler tests should exercise real SQL (constraints, defaults, unique violations),
not a mock. The issue's preference is Testcontainers (`@testcontainers/postgresql`); the
fallback is a disposable database via `DATABASE_URL_TEST` with migrations applied.

## Decision

- **ORM: Drizzle** (PRD recommendation) with the `postgres-js` driver. Migrations are
  generated with `drizzle-kit` into `drizzle/` and committed. The serverless client uses
  `postgres(url, { max: 1, prepare: false })` (small pool, no prepared statements for
  transaction-pooled connections) and is cached on `globalThis` to survive warm-lambda and
  dev hot-reload reuse. See `lib/db/client.ts`, `lib/db/schema.ts`, `drizzle.config.ts`.

- **Test harness: ephemeral real Postgres, auto-selected** (`test/db-harness.ts`):
  1. If `DATABASE_URL_TEST` is set, create a uniquely-named database on that server via the
     production `postgres-js` driver, apply the committed migrations, and `DROP` it on
     cleanup. Testcontainers plugs in here — start a container in setup and export its URI
     as `DATABASE_URL_TEST`.
  2. Otherwise, fall back to **PGlite** (`@electric-sql/pglite`), an in-process WASM build
     of Postgres. Zero Docker, zero server, zero credentials — real Postgres SQL with the
     same migrations applied. This is the default so `pnpm test` is green out of the box.

  Both strategies expose the same Drizzle `Database` to tests via `setupTestDb()` (registers
  `beforeAll`/`afterAll`, one fresh DB per test file) or `createTestDb()` (imperative).

- **Testcontainers is documented, not bundled.** Its `ssh2` native-build dependency failed
  to build in this environment and blocked `pnpm install`; since the harness consumes a URI
  (not the container API), Testcontainers is opt-in (install it + Docker, export
  `DATABASE_URL_TEST`) rather than a hard dependency.

## Consequences

- Tests run anywhere with no Docker requirement; CI and laptops both work via PGlite, while
  teams that want strict parity point `DATABASE_URL_TEST` at a real/Testcontainers Postgres.
- Migrations are the single source of truth for both production and tests (the harness reads
  the committed `drizzle/*.sql`), so a missing migration fails tests immediately.
- PGlite is a real Postgres engine but not byte-identical to a server build; the
  `DATABASE_URL_TEST` path exists for cases needing exact parity.
- Per-file database isolation keeps tests independent at the cost of a small spin-up; fine at
  this scale.
