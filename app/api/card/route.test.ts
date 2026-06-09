/**
 * Route-handler tests for GET /api/card.
 *
 * Behaviors:
 *   1. user with grants → 200 with card reflecting those grants
 *   2. user with no grants → 200 with empty card
 *   3. non-user session → 403
 *   4. no session → 403
 */
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { setupTestDb } from "@/test/db-harness";
import { users, staff, stamps, grants, completions } from "@/lib/db/schema";
import { signToken } from "@/lib/auth/token";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";

const SECRET = "card-route-test-secret";
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

function userCookie(userId: string): string {
  const token = signToken(
    { sub: userId, role: "user" },
    { secret: SECRET, ttlSeconds: 3600 },
  );
  return `${SESSION_COOKIE_NAME}=${token}`;
}

function stamperCookie(): string {
  const token = signToken(
    { sub: "stamper-1", role: "stamper" },
    { secret: SECRET, ttlSeconds: 3600 },
  );
  return `${SESSION_COOKIE_NAME}=${token}`;
}

async function getCard(cookie?: string) {
  const { GET } = await import("./route");
  const headers: Record<string, string> = {};
  if (cookie) headers.cookie = cookie;
  return GET(
    new NextRequest("http://localhost/api/card", { method: "GET", headers }),
  );
}

describe("GET /api/card", () => {
  it("user with no grants gets empty card → 200", async () => {
    const [user] = await h.db.insert(users).values({ code: "AAA111" }).returning();

    const res = await getCard(userCookie(user.id));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.card).toBeDefined();
    expect(body.card.slots).toHaveLength(5);
    expect(body.card.slots.every((s: unknown) => s === null)).toBe(true);
    expect(body.card.complete).toBe(false);
    expect(body.card.bonusCount).toBe(0);
  });

  it("user with 2 grants reflects those stamps in card → 200", async () => {
    const [user] = await h.db.insert(users).values({ code: "BBB222" }).returning();
    const [stamp1] = await h.db
      .insert(stamps)
      .values({ name: "S1", imageUrl: "https://blob/s1.png" })
      .returning();
    const [stamp2] = await h.db
      .insert(stamps)
      .values({ name: "S2", imageUrl: "https://blob/s2.png" })
      .returning();

    const t0 = new Date("2024-01-01T00:00:00Z");
    const t1 = new Date("2024-01-01T00:00:01Z");
    await h.db.insert(grants).values([
      { userId: user.id, stampId: stamp1.id, acquiredAt: t0 },
      { userId: user.id, stampId: stamp2.id, acquiredAt: t1 },
    ]);

    const res = await getCard(userCookie(user.id));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.card.activeStamps).toHaveLength(2);
    // slots now return SlotData objects, not stamp IDs
    expect(body.card.slots[0]).toMatchObject({ name: "S1", imageUrl: "https://blob/s1.png" });
    expect(body.card.slots[1]).toMatchObject({ name: "S2", imageUrl: "https://blob/s2.png" });
    expect(body.card.complete).toBe(false);
  });

  it("filled slot includes bgColor and textColor from stamps table", async () => {
    const [user] = await h.db.insert(users).values({ code: "CCC333" }).returning();
    const [stamp] = await h.db
      .insert(stamps)
      .values({ name: "Art", imageUrl: "https://blob/art.png", bgColor: "#FF0000", textColor: "#FFFFFF" })
      .returning();
    await h.db.insert(grants).values({ userId: user.id, stampId: stamp.id });

    const res = await getCard(userCookie(user.id));
    const body = await res.json();
    expect(body.card.slots[0]).toMatchObject({
      name: "Art",
      imageUrl: "https://blob/art.png",
      bgColor: "#FF0000",
      textColor: "#FFFFFF",
    });
    expect(body.card.slots[1]).toBeNull();
  });

  it("non-user session → 403", async () => {
    const res = await getCard(stamperCookie());
    expect(res.status).toBe(403);
  });

  it("no session → 403", async () => {
    const res = await getCard();
    expect(res.status).toBe(403);
  });
});
