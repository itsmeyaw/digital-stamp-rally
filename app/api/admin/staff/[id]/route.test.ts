import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { setupTestDb } from "@/test/db-harness";
import { staff, stamps } from "@/lib/db/schema";
import { signToken, type Role } from "@/lib/auth/token";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { createStamper, createRedeemer } from "@/lib/staff/staff-admin";

const SECRET = "route-test-secret";
const h = setupTestDb();

function token(role: Role): string {
  return signToken({ sub: `${role}-1`, role }, { secret: SECRET, ttlSeconds: 3600 });
}

async function seedStamp(name = "Coffee") {
  const [row] = await h.db
    .insert(stamps)
    .values({ name, imageUrl: `https://blob/${name}.png` })
    .returning();
  return row;
}

async function patch(opts: { id: string; role?: Role; body: unknown }) {
  const { PATCH } = await import("./route");
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (opts.role) headers.cookie = `${SESSION_COOKIE_NAME}=${token(opts.role)}`;
  const req = new NextRequest(`http://localhost/api/admin/staff/${opts.id}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(opts.body),
  });
  return PATCH(req, { params: Promise.resolve({ id: opts.id }) });
}

beforeAll(() => {
  process.env.SESSION_SECRET = SECRET;
  globalThis.__dsrDb = h.db;
});

beforeEach(async () => {
  await h.db.delete(staff);
  await h.db.delete(stamps);
});

describe("PATCH /api/admin/staff/[id] — reassign", () => {
  it("reassigns a stamper's bound stamp (admin) -> 200", async () => {
    const stampA = await seedStamp("A");
    const stampB = await seedStamp("B");
    const stamper = await createStamper(h.db, {
      username: "s",
      password: "pw",
      stampId: stampA.id,
    });

    const res = await patch({
      id: stamper.id,
      role: "admin",
      body: { stampId: stampB.id },
    });
    expect(res.status).toBe(200);
    expect((await res.json()).stampId).toBe(stampB.id);

    const [row] = await h.db.select().from(staff).where(eq(staff.id, stamper.id));
    expect(row.stampId).toBe(stampB.id);
  });

  it("rejects reassign to a non-existent stamp -> 400", async () => {
    const stampA = await seedStamp("A");
    const stamper = await createStamper(h.db, {
      username: "s",
      password: "pw",
      stampId: stampA.id,
    });
    const res = await patch({
      id: stamper.id,
      role: "admin",
      body: { stampId: "00000000-0000-0000-0000-000000000000" },
    });
    expect(res.status).toBe(400);
  });

  it("rejects reassign of a redeemer (not a stamper) -> 400", async () => {
    const stampA = await seedStamp("A");
    const redeemer = await createRedeemer(h.db, { username: "r", password: "pw" });
    const res = await patch({
      id: redeemer.id,
      role: "admin",
      body: { stampId: stampA.id },
    });
    expect(res.status).toBe(400);
  });

  it("rejects reassign of an unknown staff id -> 404", async () => {
    const stampA = await seedStamp("A");
    const res = await patch({
      id: "00000000-0000-0000-0000-000000000000",
      role: "admin",
      body: { stampId: stampA.id },
    });
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/admin/staff/[id] — deactivate", () => {
  it("deactivates a staff account (admin) -> 200, row preserved", async () => {
    const redeemer = await createRedeemer(h.db, { username: "r", password: "pw" });
    const res = await patch({
      id: redeemer.id,
      role: "admin",
      body: { active: false },
    });
    expect(res.status).toBe(200);
    expect((await res.json()).active).toBe(false);

    const rows = await h.db.select().from(staff).where(eq(staff.id, redeemer.id));
    expect(rows).toHaveLength(1);
    expect(rows[0].active).toBe(false);
  });

  it("a deactivated staff account can no longer log in -> 401, no cookie", async () => {
    const redeemer = await createRedeemer(h.db, { username: "bye", password: "pw" });
    await patch({ id: redeemer.id, role: "admin", body: { active: false } });

    const { POST: login } = await import("@/app/api/login/route");
    const res = await login(
      new Request("http://localhost/api/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username: "bye", password: "pw" }),
      }),
    );
    expect(res.status).toBe(401);
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("rejects deactivate of an unknown staff id -> 404", async () => {
    const res = await patch({
      id: "00000000-0000-0000-0000-000000000000",
      role: "admin",
      body: { active: false },
    });
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/admin/staff/[id] — gating & validation", () => {
  it("rejects a non-admin session -> 403", async () => {
    const redeemer = await createRedeemer(h.db, { username: "r", password: "pw" });
    const res = await patch({ id: redeemer.id, role: "stamper", body: { active: false } });
    expect(res.status).toBe(403);
  });

  it("rejects an unauthenticated request -> 403", async () => {
    const redeemer = await createRedeemer(h.db, { username: "r", password: "pw" });
    const res = await patch({ id: redeemer.id, body: { active: false } });
    expect(res.status).toBe(403);
  });

  it("rejects a body with no actionable field -> 400", async () => {
    const redeemer = await createRedeemer(h.db, { username: "r", password: "pw" });
    const res = await patch({ id: redeemer.id, role: "admin", body: {} });
    expect(res.status).toBe(400);
  });
});
