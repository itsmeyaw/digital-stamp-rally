import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { setupTestDb } from "@/test/db-harness";
import { staff, stamps } from "@/lib/db/schema";
import { signToken, type Role } from "@/lib/auth/token";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";

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

async function postStaff(opts: { role?: Role; body: unknown }) {
  const { POST } = await import("./route");
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (opts.role) headers.cookie = `${SESSION_COOKIE_NAME}=${token(opts.role)}`;
  const req = new NextRequest("http://localhost/api/admin/staff", {
    method: "POST",
    headers,
    body: JSON.stringify(opts.body),
  });
  return POST(req);
}

async function getStaff(role?: Role) {
  const { GET } = await import("./route");
  const headers: Record<string, string> = {};
  if (role) headers.cookie = `${SESSION_COOKIE_NAME}=${token(role)}`;
  return GET(
    new NextRequest("http://localhost/api/admin/staff", { method: "GET", headers }),
  );
}

beforeAll(() => {
  process.env.SESSION_SECRET = SECRET;
  globalThis.__dsrDb = h.db;
});

beforeEach(async () => {
  await h.db.delete(staff);
  await h.db.delete(stamps);
});

describe("POST /api/admin/staff", () => {
  it("creates a stamper bound to an existing stamp (admin) -> 201", async () => {
    const stamp = await seedStamp();
    const res = await postStaff({
      role: "admin",
      body: { role: "stamper", username: "stamper-a", password: "pw", stampId: stamp.id },
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.role).toBe("stamper");
    expect(body.stampId).toBe(stamp.id);
    expect(body.active).toBe(true);
    expect(body.passwordHash).toBeUndefined();

    const rows = await h.db.select().from(staff).where(eq(staff.username, "stamper-a"));
    expect(rows).toHaveLength(1);
  });

  it("creates a redeemer with no stamp binding (admin) -> 201", async () => {
    const res = await postStaff({
      role: "admin",
      body: { role: "redeemer", username: "redeemer-a", password: "pw" },
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.role).toBe("redeemer");
    expect(body.stampId).toBeNull();
  });

  it("rejects a stamper with a missing stampId -> 400 (must be bound to exactly one stamp)", async () => {
    const res = await postStaff({
      role: "admin",
      body: { role: "stamper", username: "no-stamp", password: "pw" },
    });
    expect(res.status).toBe(400);
    const rows = await h.db.select().from(staff);
    expect(rows).toHaveLength(0);
  });

  it("rejects a stamper bound to a non-existent stamp -> 400", async () => {
    const res = await postStaff({
      role: "admin",
      body: {
        role: "stamper",
        username: "bad-stamp",
        password: "pw",
        stampId: "00000000-0000-0000-0000-000000000000",
      },
    });
    expect(res.status).toBe(400);
  });

  it("rejects a duplicate username -> 409", async () => {
    const stamp = await seedStamp();
    await postStaff({
      role: "admin",
      body: { role: "stamper", username: "dup", password: "pw", stampId: stamp.id },
    });
    const res = await postStaff({
      role: "admin",
      body: { role: "redeemer", username: "dup", password: "pw" },
    });
    expect(res.status).toBe(409);
  });

  it("rejects an invalid role -> 400", async () => {
    const res = await postStaff({
      role: "admin",
      body: { role: "user", username: "x", password: "pw" },
    });
    expect(res.status).toBe(400);
  });

  it("rejects a non-admin session -> 403 and persists nothing", async () => {
    const stamp = await seedStamp();
    const res = await postStaff({
      role: "stamper",
      body: { role: "redeemer", username: "x", password: "pw" },
    });
    expect(res.status).toBe(403);
    const rows = await h.db.select().from(staff);
    expect(rows).toHaveLength(0);
    void stamp;
  });

  it("rejects an unauthenticated request -> 403", async () => {
    const res = await postStaff({
      body: { role: "redeemer", username: "x", password: "pw" },
    });
    expect(res.status).toBe(403);
  });
});

describe("created staff can log in", () => {
  async function postLogin(body: unknown) {
    const { POST } = await import("@/app/api/login/route");
    return POST(
      new Request("http://localhost/api/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      }),
    );
  }

  it("a newly created stamper can log in and lands on /scan", async () => {
    const stamp = await seedStamp();
    await postStaff({
      role: "admin",
      body: { role: "stamper", username: "freshie", password: "pw123", stampId: stamp.id },
    });
    const res = await postLogin({ username: "freshie", password: "pw123" });
    expect(res.status).toBe(200);
    expect((await res.json()).landing).toBe("/scan");
  });

  it("a newly created redeemer can log in and lands on /redeem", async () => {
    await postStaff({
      role: "admin",
      body: { role: "redeemer", username: "freshr", password: "pw123" },
    });
    const res = await postLogin({ username: "freshr", password: "pw123" });
    expect(res.status).toBe(200);
    expect((await res.json()).landing).toBe("/redeem");
  });
});

describe("GET /api/admin/staff", () => {
  it("lists stampers and redeemers (admin) -> 200", async () => {
    const stamp = await seedStamp();
    await postStaff({
      role: "admin",
      body: { role: "stamper", username: "s1", password: "pw", stampId: stamp.id },
    });
    await postStaff({
      role: "admin",
      body: { role: "redeemer", username: "r1", password: "pw" },
    });
    const res = await getStaff("admin");
    expect(res.status).toBe(200);
    const body = await res.json();
    const usernames = body.staff.map((s: { username: string }) => s.username);
    expect(usernames).toContain("s1");
    expect(usernames).toContain("r1");
    expect(body.staff[0].passwordHash).toBeUndefined();
  });

  it("rejects a non-admin session -> 403", async () => {
    const res = await getStaff("redeemer");
    expect(res.status).toBe(403);
  });
});
