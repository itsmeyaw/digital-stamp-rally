/**
 * Route-handler tests for GET /api/redeem (lookup) and POST /api/redeem (redeem).
 * Uses the db-harness + direct route import pattern.
 *
 * Behaviors tested:
 *  1. redeemer lookup → 200 eligible
 *  2. redeemer lookup → 200 blocked (returns card progress)
 *  3. redeemer lookup → 200 already_redeemed
 *  4. redeemer redeem → 200 succeeds once, second call returns alreadyRedeemed:true
 *  5. redeemer redeem → 422 not_completed (returns card)
 *  6. admin can also redeem (admin cookie → 200)
 *  7. stamper cookie → 403
 *  8. no session → 403
 *  9. eligible after post-completion stamp revoke/deactivate (Completion persists)
 */
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { setupTestDb } from "@/test/db-harness";
import {
  users,
  staff,
  stamps,
  grants,
  completions,
  redemptions,
} from "@/lib/db/schema";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { signToken } from "@/lib/auth/token";
import { eq } from "drizzle-orm";

const SECRET = "redeem-route-test-secret";
const h = setupTestDb();

beforeAll(() => {
  process.env.SESSION_SECRET = SECRET;
  globalThis.__dsrDb = h.db;
});

beforeEach(async () => {
  globalThis.__dsrDb = h.db;
  await h.db.delete(redemptions);
  await h.db.delete(completions);
  await h.db.delete(grants);
  await h.db.delete(staff);
  await h.db.delete(stamps);
  await h.db.delete(users);
});

// ─── Seed helpers ─────────────────────────────────────────────────────────────

async function seedUser(code: string) {
  const [row] = await h.db.insert(users).values({ code }).returning();
  return row;
}

async function seedStamp(name: string, active = true) {
  const [row] = await h.db
    .insert(stamps)
    .values({ name, imageUrl: `https://blob/${name}.png`, active })
    .returning();
  return row;
}

async function seedGrant(userId: string, stampId: string) {
  const [row] = await h.db
    .insert(grants)
    .values({ userId, stampId })
    .returning();
  return row;
}

async function seedCompletion(userId: string) {
  const [row] = await h.db
    .insert(completions)
    .values({ userId })
    .returning();
  return row;
}

/** Build 5 stamps + grants for a user so they are completion-eligible. */
async function seedCompletedUser(code: string) {
  const user = await seedUser(code);
  const s1 = await seedStamp(`${code}-S1`);
  const s2 = await seedStamp(`${code}-S2`);
  const s3 = await seedStamp(`${code}-S3`);
  const s4 = await seedStamp(`${code}-S4`);
  const s5 = await seedStamp(`${code}-S5`);
  await seedGrant(user.id, s1.id);
  await seedGrant(user.id, s2.id);
  await seedGrant(user.id, s3.id);
  await seedGrant(user.id, s4.id);
  await seedGrant(user.id, s5.id);
  await seedCompletion(user.id);
  return { user, stamps: [s1, s2, s3, s4, s5] };
}

// ─── Cookie helpers ───────────────────────────────────────────────────────────

function redeemerCookie(): string {
  const token = signToken(
    { sub: "redeemer-1", role: "redeemer" },
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

function stamperCookie(): string {
  const token = signToken(
    { sub: "stamper-1", role: "stamper" },
    { secret: SECRET, ttlSeconds: 3600 },
  );
  return `${SESSION_COOKIE_NAME}=${token}`;
}

// ─── Request helpers ──────────────────────────────────────────────────────────

async function getLookup(opts: { code?: string; cookie?: string }) {
  const { GET } = await import("./route");
  const url = `http://localhost/api/redeem${opts.code ? `?code=${opts.code}` : ""}`;
  const headers: Record<string, string> = {};
  if (opts.cookie) headers.cookie = opts.cookie;
  return GET(new NextRequest(url, { method: "GET", headers }));
}

async function postRedeem(opts: { body?: unknown; cookie?: string }) {
  const { POST } = await import("./route");
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (opts.cookie) headers.cookie = opts.cookie;
  return POST(
    new NextRequest("http://localhost/api/redeem", {
      method: "POST",
      headers,
      body: JSON.stringify(opts.body ?? {}),
    }),
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("GET /api/redeem (lookup)", () => {
  it("redeemer lookup → 200 eligible when Completion exists", async () => {
    const { user } = await seedCompletedUser("LOOK01");

    const res = await getLookup({ code: user.code, cookie: redeemerCookie() });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("eligible");
    expect(body.completionExists).toBe(true);
    expect(body.activeStampCount).toBe(5);
    expect(body.card).toBeDefined();
  });

  it("redeemer lookup → 200 blocked (returns card progress)", async () => {
    const user = await seedUser("LOOK02");
    const s1 = await seedStamp("LOOK02-S1");
    const s2 = await seedStamp("LOOK02-S2");
    await seedGrant(user.id, s1.id);
    await seedGrant(user.id, s2.id);
    // No Completion

    const res = await getLookup({ code: user.code, cookie: redeemerCookie() });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("blocked");
    expect(body.completionExists).toBe(false);
    expect(body.activeStampCount).toBe(2);
    expect(body.card).toBeDefined();
    expect(body.card.activeStamps).toHaveLength(2);
  });

  it("redeemer lookup → 200 already_redeemed when Redemption exists", async () => {
    const { user } = await seedCompletedUser("LOOK03");
    await h.db.insert(redemptions).values({ userId: user.id });

    const res = await getLookup({ code: user.code, cookie: redeemerCookie() });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("already_redeemed");
    expect(body.redemptionExists).toBe(true);
  });

  it("stamper cookie → 403", async () => {
    const user = await seedUser("LOOK04");
    const res = await getLookup({ code: user.code, cookie: stamperCookie() });
    expect(res.status).toBe(403);
  });

  it("no session → 403", async () => {
    const user = await seedUser("LOOK05");
    const res = await getLookup({ code: user.code });
    expect(res.status).toBe(403);
  });

  it("unknown user code → 404", async () => {
    const res = await getLookup({ code: "XXXXXX", cookie: redeemerCookie() });
    expect(res.status).toBe(404);
  });

  it("missing code query param → 400", async () => {
    const res = await getLookup({ cookie: redeemerCookie() });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/redeem (redeem action)", () => {
  it("redeemer redeem → 200 redeemed:true on first call", async () => {
    const { user } = await seedCompletedUser("RDMA01");

    const res = await postRedeem({
      cookie: redeemerCookie(),
      body: { userCode: user.code },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.redeemed).toBe(true);
    expect(body.alreadyRedeemed).toBe(false);
  });

  it("redeemer redeem → second call returns alreadyRedeemed:true", async () => {
    const { user } = await seedCompletedUser("RDMA02");

    await postRedeem({ cookie: redeemerCookie(), body: { userCode: user.code } });
    const second = await postRedeem({
      cookie: redeemerCookie(),
      body: { userCode: user.code },
    });

    expect(second.status).toBe(200);
    const body = await second.json();
    expect(body.redeemed).toBe(false);
    expect(body.alreadyRedeemed).toBe(true);
  });

  it("admin can also redeem → 200", async () => {
    const { user } = await seedCompletedUser("RDMA03");

    const res = await postRedeem({
      cookie: adminCookie(),
      body: { userCode: user.code },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.redeemed).toBe(true);
  });

  it("not_completed → 422 with card progress", async () => {
    const user = await seedUser("RDMA04");
    const s1 = await seedStamp("RDMA04-S1");
    await seedGrant(user.id, s1.id);
    // No Completion

    const res = await postRedeem({
      cookie: redeemerCookie(),
      body: { userCode: user.code },
    });

    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error).toBe("not_completed");
    expect(body.card).toBeDefined();
  });

  it("stamper cookie → 403", async () => {
    const user = await seedUser("RDMA05");
    const res = await postRedeem({
      cookie: stamperCookie(),
      body: { userCode: user.code },
    });
    expect(res.status).toBe(403);
  });

  it("no session → 403", async () => {
    const user = await seedUser("RDMA06");
    const res = await postRedeem({ body: { userCode: user.code } });
    expect(res.status).toBe(403);
  });

  it("unknown user code → 404", async () => {
    const res = await postRedeem({
      cookie: redeemerCookie(),
      body: { userCode: "ZZZZZZ" },
    });
    expect(res.status).toBe(404);
  });

  it("missing userCode → 400", async () => {
    const res = await postRedeem({
      cookie: redeemerCookie(),
      body: {},
    });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/redeem — eligible after post-completion stamp deactivation", () => {
  it("Completion persists even if a stamp is later deactivated", async () => {
    const { user, stamps: userStamps } = await seedCompletedUser("SURVV1");
    // Deactivate the 5th stamp — live card now has 4 active stamps
    await h.db
      .update(stamps)
      .set({ active: false })
      .where(eq(stamps.id, userStamps[4].id));

    const res = await getLookup({ code: user.code, cookie: redeemerCookie() });

    expect(res.status).toBe(200);
    const body = await res.json();
    // Still eligible because Completion row persists
    expect(body.status).toBe("eligible");
    expect(body.completionExists).toBe(true);
    // But live card shows 4 active stamps
    expect(body.activeStampCount).toBe(4);
  });
});
