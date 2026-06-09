/**
 * Route-handler tests for POST /api/grant.
 * Uses the db-harness + direct route import pattern.
 *
 * Behaviors tested:
 *   1. grants a stamp → 200 {granted:true, alreadyHad:false}
 *   2. duplicate → 200 {granted:false, alreadyHad:true}
 *   3. unknown user code → 404
 *   4. stamper with no bound stamp → 400
 *   5. non-stamper session → 403
 *   6. no session → 403
 *   7. missing userCode body → 400
 */
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { setupTestDb } from "@/test/db-harness";
import { users, staff, stamps, grants, completions } from "@/lib/db/schema";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { signToken } from "@/lib/auth/token";

const SECRET = "grant-route-test-secret";
const h = setupTestDb();

beforeAll(() => {
  process.env.SESSION_SECRET = SECRET;
  globalThis.__dsrDb = h.db;
});

beforeEach(async () => {
  globalThis.__dsrDb = h.db;
  await h.db.delete(completions);
  await h.db.delete(grants);
  await h.db.delete(staff);
  await h.db.delete(stamps);
  await h.db.delete(users);
});

async function seedStamp(name: string) {
  const [row] = await h.db
    .insert(stamps)
    .values({ name, imageUrl: `https://blob/${name}.png` })
    .returning();
  return row;
}

async function seedStamper(stampId: string) {
  const [row] = await h.db
    .insert(staff)
    .values({
      username: `stamper-${Math.random()}`,
      passwordHash: "hash",
      role: "stamper",
      stampId,
    })
    .returning();
  return row;
}

async function seedUser(code: string) {
  const [row] = await h.db.insert(users).values({ code }).returning();
  return row;
}

function stamperCookie(staffId: string): string {
  const token = signToken(
    { sub: staffId, role: "stamper" },
    { secret: SECRET, ttlSeconds: 3600 },
  );
  return `${SESSION_COOKIE_NAME}=${token}`;
}

function adminCookie(): string {
  const token = signToken(
    { sub: "admin-1", role: "admin" },
    { secret: SECRET, ttlSeconds: 3600 },
  );
  return `${SESSION_COOKIE_NAME}=${token}`;
}

async function postGrant(opts: {
  cookie?: string;
  body?: unknown;
}) {
  const { POST } = await import("./route");
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (opts.cookie) headers.cookie = opts.cookie;
  return POST(
    new NextRequest("http://localhost/api/grant", {
      method: "POST",
      headers,
      body: JSON.stringify(opts.body ?? {}),
    }),
  );
}

describe("POST /api/grant", () => {
  it("grants a stamp → 200 with granted=true", async () => {
    const stamp = await seedStamp("Coffee");
    const stamper = await seedStamper(stamp.id);
    const user = await seedUser("ABC123");

    const res = await postGrant({
      cookie: stamperCookie(stamper.id),
      body: { userCode: user.code },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.granted).toBe(true);
    expect(body.alreadyHad).toBe(false);
    expect(body.completionCaptured).toBe(false);
    expect(body.card).toBeDefined();
    expect(body.card.activeStamps).toHaveLength(1);
  });

  it("duplicate grant → 200 with alreadyHad=true", async () => {
    const stamp = await seedStamp("Tea");
    const stamper = await seedStamper(stamp.id);
    const user = await seedUser("DEF456");

    // First grant
    await postGrant({ cookie: stamperCookie(stamper.id), body: { userCode: user.code } });
    // Second grant
    const res = await postGrant({
      cookie: stamperCookie(stamper.id),
      body: { userCode: user.code },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.granted).toBe(false);
    expect(body.alreadyHad).toBe(true);
  });

  it("unknown user code → 404", async () => {
    const stamp = await seedStamp("Juice");
    const stamper = await seedStamper(stamp.id);

    const res = await postGrant({
      cookie: stamperCookie(stamper.id),
      body: { userCode: "XXXXXX" },
    });
    expect(res.status).toBe(404);
  });

  it("stamper not bound → 400", async () => {
    const user = await seedUser("GHI789");
    // Create a staff member with no stampId
    const [unbound] = await h.db
      .insert(staff)
      .values({
        username: `redeemer-${Math.random()}`,
        passwordHash: "hash",
        role: "redeemer",
        stampId: null,
      })
      .returning();

    const res = await postGrant({
      cookie: stamperCookie(unbound.id),
      body: { userCode: user.code },
    });
    expect(res.status).toBe(400);
  });

  it("non-stamper session → 403", async () => {
    const user = await seedUser("JKL012");
    const res = await postGrant({
      cookie: adminCookie(),
      body: { userCode: user.code },
    });
    expect(res.status).toBe(403);
  });

  it("no session → 403", async () => {
    const user = await seedUser("MNO345");
    const res = await postGrant({ body: { userCode: user.code } });
    expect(res.status).toBe(403);
  });

  it("missing userCode → 400", async () => {
    const stamp = await seedStamp("Milk");
    const stamper = await seedStamper(stamp.id);

    const res = await postGrant({
      cookie: stamperCookie(stamper.id),
      body: {},
    });
    expect(res.status).toBe(400);
  });
});
