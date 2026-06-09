/**
 * Route-handler tests for POST/DELETE /api/admin/grants.
 * Uses the db-harness + direct route import pattern.
 *
 * Behaviors tested:
 *   1. admin grant adds a stamp → 200 {granted:true, alreadyHad:false}
 *   2. admin grant to user who already has it → 200 {granted:false, alreadyHad:true}
 *   3. admin grant completing the card captures Completion → 200 {completionCaptured:true}
 *   4. admin grant on unknown user → 404
 *   5. admin grant on unknown stamp → 400
 *   6. admin grant on inactive stamp → 400
 *   7. admin revoke removes a stamp → 200 {revoked:true}, card no longer has stamp
 *   8. admin revoke of stamp user doesn't have → 200 {revoked:false}
 *   9. admin revoke on unknown user → 404
 *  10. non-admin (stamper cookie) → 403
 *  11. no session → 403
 */
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { setupTestDb } from "@/test/db-harness";
import { users, stamps, grants, completions } from "@/lib/db/schema";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { signToken } from "@/lib/auth/token";
import type { Role } from "@/lib/auth/token";

const SECRET = "admin-grants-route-test-secret";
const h = setupTestDb();

beforeAll(() => {
  process.env.SESSION_SECRET = SECRET;
  globalThis.__dsrDb = h.db;
});

beforeEach(async () => {
  globalThis.__dsrDb = h.db;
  await h.db.delete(completions);
  await h.db.delete(grants);
  await h.db.delete(stamps);
  await h.db.delete(users);
});

function makeToken(role: Role, sub = `${role}-1`): string {
  return signToken({ sub, role }, { secret: SECRET, ttlSeconds: 3600 });
}

function cookieFor(role: Role): string {
  return `${SESSION_COOKIE_NAME}=${makeToken(role)}`;
}

async function seedStamp(name: string, active = true) {
  const [row] = await h.db
    .insert(stamps)
    .values({ name, imageUrl: `https://blob/${name}.png`, active })
    .returning();
  return row;
}

async function seedUser(code: string) {
  const [row] = await h.db.insert(users).values({ code }).returning();
  return row;
}

async function postGrant(opts: {
  cookie?: string;
  body?: unknown;
}) {
  const { POST } = await import("./route");
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (opts.cookie) headers.cookie = opts.cookie;
  return POST(
    new NextRequest("http://localhost/api/admin/grants", {
      method: "POST",
      headers,
      body: JSON.stringify(opts.body ?? {}),
    }),
  );
}

async function deleteGrant(opts: {
  cookie?: string;
  body?: unknown;
}) {
  const { DELETE } = await import("./route");
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (opts.cookie) headers.cookie = opts.cookie;
  return DELETE(
    new NextRequest("http://localhost/api/admin/grants", {
      method: "DELETE",
      headers,
      body: JSON.stringify(opts.body ?? {}),
    }),
  );
}

// ─────────────────── POST /api/admin/grants ───────────────────

describe("POST /api/admin/grants", () => {
  it("admin grant adds a stamp → 200 {granted:true, alreadyHad:false}", async () => {
    const stamp = await seedStamp("Coffee");
    const user = await seedUser("ABC123");

    const res = await postGrant({
      cookie: cookieFor("admin"),
      body: { stampId: stamp.id, userCode: user.code },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.granted).toBe(true);
    expect(body.alreadyHad).toBe(false);
    expect(body.completionCaptured).toBe(false);
    expect(body.card).toBeDefined();
    expect(body.card.activeStamps).toHaveLength(1);
  });

  it("admin grant to user who already has it → 200 {granted:false, alreadyHad:true}", async () => {
    const stamp = await seedStamp("Tea");
    const user = await seedUser("DEF456");

    // Pre-grant
    await postGrant({
      cookie: cookieFor("admin"),
      body: { stampId: stamp.id, userCode: user.code },
    });

    const res = await postGrant({
      cookie: cookieFor("admin"),
      body: { stampId: stamp.id, userCode: user.code },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.granted).toBe(false);
    expect(body.alreadyHad).toBe(true);
  });

  it("admin grant completing the card → 200 {completionCaptured:true}", async () => {
    const user = await seedUser("GHI789");
    const fiveStamps = await Promise.all(
      ["P", "Q", "R", "S", "T"].map((n) => seedStamp(n)),
    );

    // Grant first 4
    for (let i = 0; i < 4; i++) {
      await postGrant({
        cookie: cookieFor("admin"),
        body: { stampId: fiveStamps[i].id, userCode: user.code },
      });
    }

    // 5th grant should capture completion
    const res = await postGrant({
      cookie: cookieFor("admin"),
      body: { stampId: fiveStamps[4].id, userCode: user.code },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.completionCaptured).toBe(true);
    expect(body.card.complete).toBe(true);

    const completionRows = await h.db.select().from(completions);
    expect(completionRows).toHaveLength(1);
  });

  it("admin grant on unknown user → 404", async () => {
    const stamp = await seedStamp("Juice");

    const res = await postGrant({
      cookie: cookieFor("admin"),
      body: { stampId: stamp.id, userCode: "XXXXXX" },
    });

    expect(res.status).toBe(404);
  });

  it("admin grant on unknown stamp → 400", async () => {
    const user = await seedUser("JKL012");

    const res = await postGrant({
      cookie: cookieFor("admin"),
      body: { stampId: "00000000-0000-0000-0000-000000000000", userCode: user.code },
    });

    expect(res.status).toBe(400);
  });

  it("admin grant on inactive stamp → 400", async () => {
    const stamp = await seedStamp("Inactive", false);
    const user = await seedUser("MNO345");

    const res = await postGrant({
      cookie: cookieFor("admin"),
      body: { stampId: stamp.id, userCode: user.code },
    });

    expect(res.status).toBe(400);
  });

  it("non-admin (stamper) session → 403", async () => {
    const stamp = await seedStamp("Nope");
    const user = await seedUser("PQR678");

    const res = await postGrant({
      cookie: cookieFor("stamper"),
      body: { stampId: stamp.id, userCode: user.code },
    });

    expect(res.status).toBe(403);
  });

  it("no session → 403", async () => {
    const stamp = await seedStamp("Anon");
    const user = await seedUser("STU901");

    const res = await postGrant({
      body: { stampId: stamp.id, userCode: user.code },
    });

    expect(res.status).toBe(403);
  });
});

// ─────────────────── DELETE /api/admin/grants ───────────────────

describe("DELETE /api/admin/grants", () => {
  it("admin revoke removes a stamp → 200 {revoked:true}, card no longer has stamp", async () => {
    const stamp = await seedStamp("Revoke");
    const user = await seedUser("VWX234");

    // Grant it first
    await postGrant({
      cookie: cookieFor("admin"),
      body: { stampId: stamp.id, userCode: user.code },
    });

    const res = await deleteGrant({
      cookie: cookieFor("admin"),
      body: { stampId: stamp.id, userCode: user.code },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.revoked).toBe(true);
    expect(body.card).toBeDefined();
    expect(body.card.activeStamps).not.toContain(stamp.id);
    expect(body.card.activeStamps).toHaveLength(0);
  });

  it("admin revoke of stamp user doesn't have → 200 {revoked:false}", async () => {
    const stamp = await seedStamp("NotOwned");
    const user = await seedUser("YZA567");

    const res = await deleteGrant({
      cookie: cookieFor("admin"),
      body: { stampId: stamp.id, userCode: user.code },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.revoked).toBe(false);
  });

  it("admin revoke on unknown user → 404", async () => {
    const stamp = await seedStamp("Z");

    const res = await deleteGrant({
      cookie: cookieFor("admin"),
      body: { stampId: stamp.id, userCode: "XXXXXX" },
    });

    expect(res.status).toBe(404);
  });

  it("non-admin (stamper) session → 403", async () => {
    const stamp = await seedStamp("NopeRevoke");
    const user = await seedUser("BCD890");

    const res = await deleteGrant({
      cookie: cookieFor("stamper"),
      body: { stampId: stamp.id, userCode: user.code },
    });

    expect(res.status).toBe(403);
  });

  it("no session → 403", async () => {
    const stamp = await seedStamp("AnonRevoke");
    const user = await seedUser("EFG123");

    const res = await deleteGrant({
      body: { stampId: stamp.id, userCode: user.code },
    });

    expect(res.status).toBe(403);
  });
});
