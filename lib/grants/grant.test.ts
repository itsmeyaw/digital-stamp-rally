/**
 * TDD tests for lib/grants/grant.ts — the core stamping domain logic.
 * Uses the ephemeral Postgres harness (PGlite in CI).
 *
 * All slices RED → GREEN in order:
 *   1. grants a stamp to a user
 *   2. duplicate grant is a no-op (alreadyHad=true)
 *   3. earliest-free-slot order (first acquired stamp in slot 0)
 *   4. bonus beyond 5 stamps
 *   5. Completion captured exactly once on 5th distinct active stamp
 *   6. second crossing does NOT create a second Completion
 *   7. user_not_found error
 *   8. stamper_not_bound error
 */
import { describe, it, expect, beforeEach } from "vitest";
import { setupTestDb } from "@/test/db-harness";
import { users, staff, stamps, grants, completions } from "@/lib/db/schema";
import { grantStamp, GrantError } from "./grant";

const h = setupTestDb();

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

async function seedStamperUnbound() {
  const [row] = await h.db
    .insert(staff)
    .values({
      username: `redeemer-${Math.random()}`,
      passwordHash: "hash",
      role: "redeemer",
      stampId: null,
    })
    .returning();
  return row;
}

beforeEach(async () => {
  // Clean in FK order
  await h.db.delete(completions);
  await h.db.delete(grants);
  await h.db.delete(staff);
  await h.db.delete(stamps);
  await h.db.delete(users);
});

describe("grantStamp — basic grant", () => {
  it("grants a stamp to a user and returns granted=true with card progress", async () => {
    const stamp = await seedStamp("Coffee");
    const stamper = await seedStamper(stamp.id);
    const user = await seedUser("ABC123");

    const result = await grantStamp(h.db, {
      stamperStaffId: stamper.id,
      userCode: user.code,
    });

    expect(result.granted).toBe(true);
    expect(result.alreadyHad).toBe(false);
    expect(result.completionCaptured).toBe(false);
    // card has 1 active stamp
    expect(result.card.activeStamps).toHaveLength(1);
    expect(result.card.activeStamps[0]).toBe(stamp.id);
    expect(result.card.slots[0]).toBe(stamp.id);
    expect(result.card.complete).toBe(false);
    expect(result.card.bonusCount).toBe(0);
  });
});

describe("grantStamp — duplicate no-op", () => {
  it("duplicate grant returns alreadyHad=true without error", async () => {
    const stamp = await seedStamp("Tea");
    const stamper = await seedStamper(stamp.id);
    const user = await seedUser("DEF456");

    // First grant
    await grantStamp(h.db, { stamperStaffId: stamper.id, userCode: user.code });
    // Second grant — same stamp
    const result = await grantStamp(h.db, {
      stamperStaffId: stamper.id,
      userCode: user.code,
    });

    expect(result.granted).toBe(false);
    expect(result.alreadyHad).toBe(true);
    expect(result.completionCaptured).toBe(false);
    // Card still shows 1 stamp
    expect(result.card.activeStamps).toHaveLength(1);
  });
});

describe("grantStamp — earliest-free-slot order", () => {
  it("places stamps in slots ordered by acquiredAt ascending", async () => {
    const stamp1 = await seedStamp("StampA");
    const stamp2 = await seedStamp("StampB");
    const stamper1 = await seedStamper(stamp1.id);
    const stamper2 = await seedStamper(stamp2.id);
    const user = await seedUser("GHI789");

    await grantStamp(h.db, { stamperStaffId: stamper1.id, userCode: user.code });
    await grantStamp(h.db, { stamperStaffId: stamper2.id, userCode: user.code });

    const result = await grantStamp(h.db, {
      stamperStaffId: stamper2.id,
      userCode: user.code,
    });
    // Already had stamp2; card should still show stamp1 in slot 0, stamp2 in slot 1
    expect(result.card.slots[0]).toBe(stamp1.id);
    expect(result.card.slots[1]).toBe(stamp2.id);
  });
});

describe("grantStamp — bonus beyond 5", () => {
  it("6th stamp goes to bonus, no second Completion", async () => {
    const user = await seedUser("JKL012");
    // Seed 5 stamps and grant them all
    const fiveStamps = await Promise.all(
      ["S1", "S2", "S3", "S4", "S5"].map((n) => seedStamp(n)),
    );
    for (const s of fiveStamps) {
      const stamper = await seedStamper(s.id);
      await grantStamp(h.db, { stamperStaffId: stamper.id, userCode: user.code });
    }

    // 6th stamp
    const stamp6 = await seedStamp("S6");
    const stamper6 = await seedStamper(stamp6.id);
    const result = await grantStamp(h.db, {
      stamperStaffId: stamper6.id,
      userCode: user.code,
    });

    expect(result.granted).toBe(true);
    expect(result.alreadyHad).toBe(false);
    expect(result.completionCaptured).toBe(false); // already captured on 5th
    expect(result.card.complete).toBe(true);
    expect(result.card.bonusCount).toBe(1);
  });
});

describe("grantStamp — Completion captured exactly once", () => {
  it("captures Completion on the 5th distinct active stamp", async () => {
    const user = await seedUser("MNO345");
    const fiveStamps = await Promise.all(
      ["A", "B", "C", "D", "E"].map((n) => seedStamp(n)),
    );

    let lastResult;
    for (let i = 0; i < 4; i++) {
      const stamper = await seedStamper(fiveStamps[i].id);
      lastResult = await grantStamp(h.db, {
        stamperStaffId: stamper.id,
        userCode: user.code,
      });
      expect(lastResult.completionCaptured).toBe(false);
    }

    // 5th grant should capture completion
    const stamper5 = await seedStamper(fiveStamps[4].id);
    const result = await grantStamp(h.db, {
      stamperStaffId: stamper5.id,
      userCode: user.code,
    });

    expect(result.completionCaptured).toBe(true);
    expect(result.card.complete).toBe(true);

    // Verify Completion row in DB
    const completionRows = await h.db.select().from(completions);
    expect(completionRows).toHaveLength(1);
    expect(completionRows[0].userId).toBe(user.id);
  });

  it("second crossing does NOT create a second Completion row", async () => {
    const user = await seedUser("PQR678");
    const fiveStamps = await Promise.all(
      ["P", "Q", "R", "S", "T"].map((n) => seedStamp(n)),
    );

    for (const s of fiveStamps) {
      const stamper = await seedStamper(s.id);
      await grantStamp(h.db, { stamperStaffId: stamper.id, userCode: user.code });
    }

    // 6th stamp (bonus, no new completion)
    const stamp6 = await seedStamp("U");
    const stamper6 = await seedStamper(stamp6.id);
    const result = await grantStamp(h.db, {
      stamperStaffId: stamper6.id,
      userCode: user.code,
    });

    expect(result.completionCaptured).toBe(false);
    const completionRows = await h.db.select().from(completions);
    expect(completionRows).toHaveLength(1); // still only 1
  });
});

describe("grantStamp — error cases", () => {
  it("throws GrantError user_not_found for unknown user code", async () => {
    const stamp = await seedStamp("X");
    const stamper = await seedStamper(stamp.id);

    await expect(
      grantStamp(h.db, { stamperStaffId: stamper.id, userCode: "XXXXXX" }),
    ).rejects.toThrow(GrantError);

    await expect(
      grantStamp(h.db, { stamperStaffId: stamper.id, userCode: "XXXXXX" }),
    ).rejects.toMatchObject({ code: "user_not_found" });
  });

  it("throws GrantError stamper_not_bound when staff has no stampId", async () => {
    const unbound = await seedStamperUnbound();
    const user = await seedUser("STU901");

    await expect(
      grantStamp(h.db, { stamperStaffId: unbound.id, userCode: user.code }),
    ).rejects.toThrow(GrantError);

    await expect(
      grantStamp(h.db, { stamperStaffId: unbound.id, userCode: user.code }),
    ).rejects.toMatchObject({ code: "stamper_not_bound" });
  });
});
