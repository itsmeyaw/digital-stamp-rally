/**
 * TDD tests for lib/grants/admin-grants.ts — admin grant/revoke domain logic.
 * Uses the ephemeral Postgres harness (PGlite in CI).
 *
 * All slices RED → GREEN in order:
 *   1. adminGrantStamp grants a stamp to a user
 *   2. adminGrantStamp duplicate → alreadyHad=true
 *   3. adminGrantStamp completing the card captures Completion
 *   4. adminGrantStamp user_not_found
 *   5. adminGrantStamp stamp_not_found
 *   6. adminGrantStamp stamp_inactive
 *   7. adminRevokeStamp removes a stamp, card compacts left
 *   8. adminRevokeStamp of stamp user doesn't have → revoked=false
 *   9. adminRevokeStamp user_not_found
 *  10. adminRevokeStamp stamp_not_found
 */
import { describe, it, expect, beforeEach } from "vitest";
import { setupTestDb } from "@/test/db-harness";
import { users, stamps, grants, completions } from "@/lib/db/schema";
import { adminGrantStamp, adminRevokeStamp, AdminGrantError } from "./admin-grants";

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

beforeEach(async () => {
  // Clean in FK order
  await h.db.delete(completions);
  await h.db.delete(grants);
  await h.db.delete(stamps);
  await h.db.delete(users);
});

describe("adminGrantStamp — basic grant", () => {
  it("grants a stamp to a user and returns granted=true with card progress", async () => {
    const stamp = await seedStamp("Coffee");
    const user = await seedUser("ABC123");

    const result = await adminGrantStamp(h.db, {
      stampId: stamp.id,
      userCode: user.code,
    });

    expect(result.granted).toBe(true);
    expect(result.alreadyHad).toBe(false);
    expect(result.completionCaptured).toBe(false);
    expect(result.card.activeStamps).toHaveLength(1);
    expect(result.card.activeStamps[0]).toBe(stamp.id);
    expect(result.card.slots[0]).toBe(stamp.id);
    expect(result.card.complete).toBe(false);
    expect(result.card.bonusCount).toBe(0);
  });
});

describe("adminGrantStamp — duplicate no-op", () => {
  it("duplicate grant returns alreadyHad=true without error", async () => {
    const stamp = await seedStamp("Tea");
    const user = await seedUser("DEF456");

    // First grant
    await adminGrantStamp(h.db, { stampId: stamp.id, userCode: user.code });
    // Second grant — same stamp
    const result = await adminGrantStamp(h.db, {
      stampId: stamp.id,
      userCode: user.code,
    });

    expect(result.granted).toBe(false);
    expect(result.alreadyHad).toBe(true);
    expect(result.completionCaptured).toBe(false);
    expect(result.card.activeStamps).toHaveLength(1);
  });
});

describe("adminGrantStamp — Completion captured on 5th stamp", () => {
  it("captures Completion on the 5th distinct active stamp", async () => {
    const user = await seedUser("MNO345");
    const fiveStamps = await Promise.all(
      ["A", "B", "C", "D", "E"].map((n) => seedStamp(n)),
    );

    for (let i = 0; i < 4; i++) {
      const result = await adminGrantStamp(h.db, {
        stampId: fiveStamps[i].id,
        userCode: user.code,
      });
      expect(result.completionCaptured).toBe(false);
    }

    // 5th grant should capture completion
    const result = await adminGrantStamp(h.db, {
      stampId: fiveStamps[4].id,
      userCode: user.code,
    });

    expect(result.completionCaptured).toBe(true);
    expect(result.card.complete).toBe(true);

    // Verify Completion row in DB
    const completionRows = await h.db.select().from(completions);
    expect(completionRows).toHaveLength(1);
    expect(completionRows[0].userId).toBe(user.id);
  });
});

describe("adminGrantStamp — error cases", () => {
  it("throws AdminGrantError user_not_found for unknown user code", async () => {
    const stamp = await seedStamp("X");

    await expect(
      adminGrantStamp(h.db, { stampId: stamp.id, userCode: "XXXXXX" }),
    ).rejects.toThrow(AdminGrantError);

    await expect(
      adminGrantStamp(h.db, { stampId: stamp.id, userCode: "XXXXXX" }),
    ).rejects.toMatchObject({ code: "user_not_found" });
  });

  it("throws AdminGrantError stamp_not_found for unknown stampId", async () => {
    const user = await seedUser("STU901");
    const fakeStampId = "00000000-0000-0000-0000-000000000000";

    await expect(
      adminGrantStamp(h.db, { stampId: fakeStampId, userCode: user.code }),
    ).rejects.toThrow(AdminGrantError);

    await expect(
      adminGrantStamp(h.db, { stampId: fakeStampId, userCode: user.code }),
    ).rejects.toMatchObject({ code: "stamp_not_found" });
  });

  it("throws AdminGrantError stamp_inactive for inactive stamp", async () => {
    const stamp = await seedStamp("Inactive", false);
    const user = await seedUser("VWX234");

    await expect(
      adminGrantStamp(h.db, { stampId: stamp.id, userCode: user.code }),
    ).rejects.toThrow(AdminGrantError);

    await expect(
      adminGrantStamp(h.db, { stampId: stamp.id, userCode: user.code }),
    ).rejects.toMatchObject({ code: "stamp_inactive" });
  });
});

describe("adminRevokeStamp — removes a stamp", () => {
  it("revokes a stamp from a user and returns revoked=true, card no longer has it", async () => {
    const stamp1 = await seedStamp("StampA");
    const stamp2 = await seedStamp("StampB");
    const stamp3 = await seedStamp("StampC");
    const user = await seedUser("YZA567");

    // Grant all three
    await adminGrantStamp(h.db, { stampId: stamp1.id, userCode: user.code });
    await adminGrantStamp(h.db, { stampId: stamp2.id, userCode: user.code });
    await adminGrantStamp(h.db, { stampId: stamp3.id, userCode: user.code });

    // Revoke the middle stamp
    const result = await adminRevokeStamp(h.db, {
      stampId: stamp2.id,
      userCode: user.code,
    });

    expect(result.revoked).toBe(true);
    // Card should compact left — stamp1 in slot0, stamp3 in slot1, slot2=null
    expect(result.card.activeStamps).toHaveLength(2);
    expect(result.card.activeStamps).not.toContain(stamp2.id);
    expect(result.card.slots[0]).toBe(stamp1.id);
    expect(result.card.slots[1]).toBe(stamp3.id);
    expect(result.card.slots[2]).toBeNull();
  });
});

describe("adminRevokeStamp — stamp user doesn't have", () => {
  it("returns revoked=false when user doesn't have the stamp", async () => {
    const stamp = await seedStamp("NotOwned");
    const user = await seedUser("BCD890");

    const result = await adminRevokeStamp(h.db, {
      stampId: stamp.id,
      userCode: user.code,
    });

    expect(result.revoked).toBe(false);
    expect(result.card.activeStamps).toHaveLength(0);
  });
});

describe("adminRevokeStamp — error cases", () => {
  it("throws AdminGrantError user_not_found for unknown user code", async () => {
    const stamp = await seedStamp("Y");

    await expect(
      adminRevokeStamp(h.db, { stampId: stamp.id, userCode: "XXXXXX" }),
    ).rejects.toThrow(AdminGrantError);

    await expect(
      adminRevokeStamp(h.db, { stampId: stamp.id, userCode: "XXXXXX" }),
    ).rejects.toMatchObject({ code: "user_not_found" });
  });

  it("throws AdminGrantError stamp_not_found for unknown stampId", async () => {
    const user = await seedUser("EFG123");
    const fakeStampId = "00000000-0000-0000-0000-000000000001";

    await expect(
      adminRevokeStamp(h.db, { stampId: fakeStampId, userCode: user.code }),
    ).rejects.toThrow(AdminGrantError);

    await expect(
      adminRevokeStamp(h.db, { stampId: fakeStampId, userCode: user.code }),
    ).rejects.toMatchObject({ code: "stamp_not_found" });
  });
});
