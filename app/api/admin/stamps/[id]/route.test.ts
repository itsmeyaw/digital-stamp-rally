/**
 * Route-handler tests for PATCH /api/admin/stamps/[id] (issue #9).
 *
 * Behaviors:
 *   1. admin PATCH { active: false } → 200, stamp.active=false
 *   2. non-admin session → 403
 *   3. unknown stampId → 404
 *   4. PATCH with active:true → 400 (only deactivation supported)
 *   5. PATCH with missing body → 400
 */
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { setupTestDb } from "@/test/db-harness";
import { stamps } from "@/lib/db/schema";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { signToken, type Role } from "@/lib/auth/token";

const SECRET = "admin-stamp-patch-test-secret";
const h = setupTestDb();

beforeAll(() => {
  process.env.SESSION_SECRET = SECRET;
  globalThis.__dsrDb = h.db;
});

beforeEach(async () => {
  globalThis.__dsrDb = h.db;
  await h.db.delete(stamps);
});

function token(role: Role): string {
  return signToken(
    { sub: `${role}-1`, role },
    { secret: SECRET, ttlSeconds: 3600 },
  );
}

function cookie(role: Role): string {
  return `${SESSION_COOKIE_NAME}=${token(role)}`;
}

async function patchStamp(opts: {
  stampId: string;
  role?: Role;
  body?: unknown;
}) {
  const { PATCH } = await import("./route");
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (opts.role) headers.cookie = cookie(opts.role);
  return PATCH(
    new NextRequest(`http://localhost/api/admin/stamps/${opts.stampId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(opts.body ?? { active: false }),
    }),
    { params: Promise.resolve({ id: opts.stampId }) },
  );
}

async function seedStamp(name: string) {
  const [row] = await h.db
    .insert(stamps)
    .values({ name, imageUrl: `https://blob/${name}.png` })
    .returning();
  return row;
}

describe("PATCH /api/admin/stamps/[id]", () => {
  it("admin can deactivate a stamp → 200 with active=false", async () => {
    const stamp = await seedStamp("Coffee");

    const res = await patchStamp({
      stampId: stamp.id,
      role: "admin",
      body: { active: false },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.stamp.id).toBe(stamp.id);
    expect(body.stamp.active).toBe(false);
    expect(body.stamp.name).toBe("Coffee");

    // DB reflects the change
    const all = await h.db.select().from(stamps);
    expect(all[0].active).toBe(false);
  });

  it("non-admin session → 403", async () => {
    const stamp = await seedStamp("Tea");
    const res = await patchStamp({
      stampId: stamp.id,
      role: "stamper",
      body: { active: false },
    });
    expect(res.status).toBe(403);
  });

  it("no session → 403", async () => {
    const stamp = await seedStamp("Tea");
    const res = await patchStamp({
      stampId: stamp.id,
      body: { active: false },
    });
    expect(res.status).toBe(403);
  });

  it("unknown stampId → 404", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const res = await patchStamp({
      stampId: fakeId,
      role: "admin",
      body: { active: false },
    });
    expect(res.status).toBe(404);
  });

  it("PATCH with active:true → 400 (only deactivation is supported)", async () => {
    const stamp = await seedStamp("Juice");
    const res = await patchStamp({
      stampId: stamp.id,
      role: "admin",
      body: { active: true },
    });
    expect(res.status).toBe(400);
  });

  it("PATCH with missing body → 400", async () => {
    const stamp = await seedStamp("Milk");
    const { PATCH } = await import("./route");
    const headers: Record<string, string> = {
      cookie: cookie("admin"),
    };
    const res = await PATCH(
      new NextRequest(`http://localhost/api/admin/stamps/${stamp.id}`, {
        method: "PATCH",
        headers,
        // no body / body is empty object that doesn't contain `active`
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ id: stamp.id }) },
    );
    expect(res.status).toBe(400);
  });
});
