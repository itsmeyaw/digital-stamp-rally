/**
 * Domain tests for lib/redeem/redeem.ts (issue #10).
 *
 * Behaviors tested:
 *  1. lookupUser → eligible when Completion exists, no Redemption
 *  2. lookupUser → already_redeemed when Redemption exists
 *  3. lookupUser → blocked when no Completion
 *  4. lookupUser → user_not_found error for unknown code
 *  5. lookupUser → eligible status survives post-completion stamp deactivation
 *  6. redeemUser → succeeds once, returns redeemed:true
 *  7. redeemUser → second call returns alreadyRedeemed:true (not a new row)
 *  8. redeemUser → not_completed error for user without Completion
 *  9. redeemUser → user_not_found error for unknown code
 */
import { describe, it, expect, beforeEach } from "vitest";
import { setupTestDb } from "@/test/db-harness";
import {
  users,
  stamps,
  grants,
  completions,
  redemptions,
} from "@/lib/db/schema";
import { lookupUser, redeemUser, RedeemError } from "./redeem";

const h = setupTestDb();

beforeEach(async () => {
  await h.db.delete(redemptions);
  await h.db.delete(completions);
  await h.db.delete(grants);
  await h.db.delete(stamps);
  await h.db.delete(users);
});

// ─── Seed helpers ────────────────────────────────────────────────────────────

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

async function seedRedemption(userId: string) {
  const [row] = await h.db
    .insert(redemptions)
    .values({ userId })
    .returning();
  return row;
}

// ─── lookupUser tests ─────────────────────────────────────────────────────────

describe("lookupUser", () => {
  it("returns eligible when Completion exists and no Redemption", async () => {
    const user = await seedUser("ABC123");
    const s1 = await seedStamp("S1");
    const s2 = await seedStamp("S2");
    const s3 = await seedStamp("S3");
    const s4 = await seedStamp("S4");
    const s5 = await seedStamp("S5");
    await seedGrant(user.id, s1.id);
    await seedGrant(user.id, s2.id);
    await seedGrant(user.id, s3.id);
    await seedGrant(user.id, s4.id);
    await seedGrant(user.id, s5.id);
    await seedCompletion(user.id);

    const result = await lookupUser(h.db, "ABC123");

    expect(result.status).toBe("eligible");
    expect(result.completionExists).toBe(true);
    expect(result.redemptionExists).toBe(false);
    expect(result.activeStampCount).toBe(5);
  });

  it("returns already_redeemed when Redemption exists", async () => {
    const user = await seedUser("DEF456");
    const s1 = await seedStamp("T1");
    const s2 = await seedStamp("T2");
    const s3 = await seedStamp("T3");
    const s4 = await seedStamp("T4");
    const s5 = await seedStamp("T5");
    await seedGrant(user.id, s1.id);
    await seedGrant(user.id, s2.id);
    await seedGrant(user.id, s3.id);
    await seedGrant(user.id, s4.id);
    await seedGrant(user.id, s5.id);
    await seedCompletion(user.id);
    await seedRedemption(user.id);

    const result = await lookupUser(h.db, "DEF456");

    expect(result.status).toBe("already_redeemed");
    expect(result.completionExists).toBe(true);
    expect(result.redemptionExists).toBe(true);
  });

  it("returns blocked when no Completion", async () => {
    const user = await seedUser("GHI789");
    const s1 = await seedStamp("U1");
    const s2 = await seedStamp("U2");
    await seedGrant(user.id, s1.id);
    await seedGrant(user.id, s2.id);

    const result = await lookupUser(h.db, "GHI789");

    expect(result.status).toBe("blocked");
    expect(result.completionExists).toBe(false);
    expect(result.redemptionExists).toBe(false);
    expect(result.activeStampCount).toBe(2);
  });

  it("throws RedeemError user_not_found for unknown code", async () => {
    await expect(lookupUser(h.db, "XXXXXX")).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof RedeemError && err.code === "user_not_found",
    );
  });

  it("eligible status survives post-completion stamp deactivation (Completion persists)", async () => {
    const user = await seedUser("JKL012");
    const s1 = await seedStamp("V1");
    const s2 = await seedStamp("V2");
    const s3 = await seedStamp("V3");
    const s4 = await seedStamp("V4");
    const s5 = await seedStamp("V5");
    await seedGrant(user.id, s1.id);
    await seedGrant(user.id, s2.id);
    await seedGrant(user.id, s3.id);
    await seedGrant(user.id, s4.id);
    await seedGrant(user.id, s5.id);
    // Completion was captured when all 5 were active
    await seedCompletion(user.id);
    // Now deactivate one stamp — live card drops to 4
    const { eq } = await import("drizzle-orm");
    await h.db.update(stamps).set({ active: false }).where(eq(stamps.id, s5.id));

    const result = await lookupUser(h.db, "JKL012");

    // Completion row still exists → should be eligible
    expect(result.status).toBe("eligible");
    expect(result.completionExists).toBe(true);
    // live card count dropped to 4 (one stamp deactivated)
    expect(result.activeStampCount).toBe(4);
  });
});

// ─── redeemUser tests ─────────────────────────────────────────────────────────

describe("redeemUser", () => {
  it("succeeds once and returns redeemed:true", async () => {
    const user = await seedUser("MNO345");
    const s1 = await seedStamp("W1");
    const s2 = await seedStamp("W2");
    const s3 = await seedStamp("W3");
    const s4 = await seedStamp("W4");
    const s5 = await seedStamp("W5");
    await seedGrant(user.id, s1.id);
    await seedGrant(user.id, s2.id);
    await seedGrant(user.id, s3.id);
    await seedGrant(user.id, s4.id);
    await seedGrant(user.id, s5.id);
    await seedCompletion(user.id);

    const result = await redeemUser(h.db, "MNO345");

    expect(result.redeemed).toBe(true);
    expect(result.alreadyRedeemed).toBe(false);
  });

  it("second call returns alreadyRedeemed:true (idempotent)", async () => {
    const user = await seedUser("PQR678");
    const s1 = await seedStamp("X1");
    const s2 = await seedStamp("X2");
    const s3 = await seedStamp("X3");
    const s4 = await seedStamp("X4");
    const s5 = await seedStamp("X5");
    await seedGrant(user.id, s1.id);
    await seedGrant(user.id, s2.id);
    await seedGrant(user.id, s3.id);
    await seedGrant(user.id, s4.id);
    await seedGrant(user.id, s5.id);
    await seedCompletion(user.id);

    await redeemUser(h.db, "PQR678");
    const second = await redeemUser(h.db, "PQR678");

    expect(second.redeemed).toBe(false);
    expect(second.alreadyRedeemed).toBe(true);
  });

  it("throws RedeemError not_completed for user without Completion", async () => {
    const user = await seedUser("STU901");
    const s1 = await seedStamp("Y1");
    await seedGrant(user.id, s1.id);

    await expect(redeemUser(h.db, "STU901")).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof RedeemError && err.code === "not_completed",
    );
  });

  it("throws RedeemError user_not_found for unknown code", async () => {
    await expect(redeemUser(h.db, "ZZZZZ1")).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof RedeemError && err.code === "user_not_found",
    );
  });
});
