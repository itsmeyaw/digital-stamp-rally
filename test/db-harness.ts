/**
 * Ephemeral real-Postgres test harness — the reference harness all later slices
 * reuse. It gives each test file a freshly-migrated, isolated database.
 *
 * Strategy (auto-selected, in order):
 *   1. DATABASE_URL_TEST set  -> create a uniquely-named ephemeral database on
 *      that Postgres server (via the production `postgres-js` driver), run the
 *      Drizzle migrations against it, and DROP it on cleanup. This is the
 *      closest match to production and is the path Testcontainers feeds into.
 *   2. Otherwise              -> PGlite (in-process WASM Postgres). Zero setup,
 *      no Docker, no server, no credentials — works in any CI. Still a real
 *      Postgres engine with the migrations applied.
 *
 * To run against Testcontainers (preferred when Docker is available), start a
 * `@testcontainers/postgresql` container in a global setup and export its URI
 * as DATABASE_URL_TEST; strategy (1) then takes over unchanged.
 *
 * Usage in a test file:
 *
 *   import { setupTestDb } from "@/test/db-harness";
 *   const h = setupTestDb();          // registers beforeAll/afterAll hooks
 *   // inside a test: h.db, h.url
 *
 * Or imperatively:
 *
 *   const { db, url, cleanup } = await createTestDb();
 *   ...
 *   await cleanup();
 */
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { beforeAll, afterAll } from "vitest";
import type { Database } from "@/lib/db/client";

const MIGRATIONS_DIR = resolve(process.cwd(), "drizzle");

export interface TestDb {
  /** Drizzle database bound to the ephemeral Postgres. */
  db: Database;
  /** Connection string (postgres-js strategy) or "pglite" sentinel. */
  url: string;
  /** Drop the ephemeral database / close the connection. */
  cleanup: () => Promise<void>;
}

/** Ordered list of migration SQL statements from the drizzle/ output folder. */
function loadMigrationStatements(): string[] {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  const statements: string[] = [];
  for (const file of files) {
    const sql = readFileSync(resolve(MIGRATIONS_DIR, file), "utf8");
    // Drizzle separates statements with a breakpoint marker.
    for (const part of sql.split("--> statement-breakpoint")) {
      const trimmed = part.trim();
      if (trimmed) statements.push(trimmed);
    }
  }
  return statements;
}

async function createPostgresJsDb(adminUrl: string): Promise<TestDb> {
  const postgres = (await import("postgres")).default;
  const { drizzle } = await import("drizzle-orm/postgres-js");
  const schema = await import("@/lib/db/schema");

  const dbName = `dsr_test_${randomUUID().replace(/-/g, "")}`;
  const admin = postgres(adminUrl, { max: 1, prepare: false });
  await admin.unsafe(`CREATE DATABASE "${dbName}"`);
  await admin.end();

  // Build the ephemeral DB's URL by swapping the database path.
  const parsed = new URL(adminUrl);
  parsed.pathname = `/${dbName}`;
  const url = parsed.toString();

  const sql = postgres(url, { max: 1, prepare: false });
  for (const stmt of loadMigrationStatements()) {
    await sql.unsafe(stmt);
  }
  const db = drizzle(sql, { schema }) as unknown as Database;

  const cleanup = async () => {
    await sql.end();
    const dropper = postgres(adminUrl, { max: 1, prepare: false });
    await dropper.unsafe(
      `DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`,
    );
    await dropper.end();
  };

  return { db, url, cleanup };
}

async function createPgliteDb(): Promise<TestDb> {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const schema = await import("@/lib/db/schema");

  const client = new PGlite();
  for (const stmt of loadMigrationStatements()) {
    await client.exec(stmt);
  }
  const db = drizzle(client, { schema }) as unknown as Database;

  const cleanup = async () => {
    await client.close();
  };

  return { db, url: "pglite", cleanup };
}

/** Imperatively create an ephemeral, migrated test database. */
export async function createTestDb(): Promise<TestDb> {
  const adminUrl = process.env.DATABASE_URL_TEST;
  if (adminUrl) {
    return createPostgresJsDb(adminUrl);
  }
  return createPgliteDb();
}

/**
 * Register Vitest lifecycle hooks that stand up one ephemeral DB per test file
 * and tear it down afterwards. Returns a live handle (`handle.db`) usable inside
 * tests once `beforeAll` has run.
 */
export function setupTestDb(): { db: Database; url: string } {
  const handle = {} as { db: Database; url: string };
  let active: TestDb;

  beforeAll(async () => {
    active = await createTestDb();
    handle.db = active.db;
    handle.url = active.url;
  });

  afterAll(async () => {
    await active?.cleanup();
  });

  return handle;
}
