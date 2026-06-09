/**
 * TDD tests for deactivateStamp domain function (issue #9).
 *
 * Behaviors:
 *   1. deactivating a stamp sets active=false, stamp still exists in DB
 *   2. deactivating a stamp that doesn't exist → StampNotFoundError
 *   3. a user with a grant on a deactivated stamp → getCard no longer shows it
 *   4. a user who completed before deactivation retains their Completion
 */
import { describe, it, expect, beforeEach } from "vitest";
import { setupTestDb } from "@/test/db-harness";
import { stamps, users, grants, completions } from "@/lib/db/schema";
import { deactivateStamp, StampNotFoundError } from "./deactivate-stamp";
import { getCard } from "@/lib/user/card";

const h = setupTestDb();

beforeEach(async () => {
  await h.db.delete(completions);
  await h.db.delete(grants);
  await h.db.delete(stamps);
  await h.db.delete(users);
});

describe("deactivateStamp", () => {
  it("sets active=false on the stamp without deleting it", async () => {
    const [stamp] = await h.db
      .insert(stamps)
      .values({ name: "Coffee", imageUrl: "https://blob/coffee.png" })
      .returning();

    const updated = await deactivateStamp(h.db, stamp.id);

    expect(updated.id).toBe(stamp.id);
    expect(updated.active).toBe(false);
    expect(updated.name).toBe("Coffee");

    // Still exists in the DB
    const all = await h.db.select().from(stamps);
    expect(all).toHaveLength(1);
    expect(all[0].active).toBe(false);
  });

  it("throws StampNotFoundError for an unknown stamp id", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    await expect(deactivateStamp(h.db, fakeId)).rejects.toBeInstanceOf(
      StampNotFoundError,
    );
  });

  it("deactivated stamp disappears from getCard slots", async () => {
    const [stamp] = await h.db
      .insert(stamps)
      .values({ name: "Tea", imageUrl: "https://blob/tea.png" })
      .returning();
    const [user] = await h.db
      .insert(users)
      .values({ code: "AAAAAA" })
      .returning();
    await h.db.insert(grants).values({ userId: user.id, stampId: stamp.id });

    // Before deactivation, stamp appears on the card
    const before = await getCard(h.db, user.id);
    expect(before.activeStamps).toContain(stamp.id);

    // Deactivate
    await deactivateStamp(h.db, stamp.id);

    // After deactivation, stamp no longer appears
    const after = await getCard(h.db, user.id);
    expect(after.activeStamps).not.toContain(stamp.id);
    expect(after.slots.every((s) => s === null)).toBe(true);
    expect(after.complete).toBe(false);
  });

  it("retains pre-existing Completion after stamp deactivation", async () => {
    // Seed 5 stamps
    const stampRows = await h.db
      .insert(stamps)
      .values([
        { name: "S1", imageUrl: "https://b/1.png" },
        { name: "S2", imageUrl: "https://b/2.png" },
        { name: "S3", imageUrl: "https://b/3.png" },
        { name: "S4", imageUrl: "https://b/4.png" },
        { name: "S5", imageUrl: "https://b/5.png" },
      ])
      .returning();

    const [user] = await h.db
      .insert(users)
      .values({ code: "BBBBBB" })
      .returning();

    // Grant all 5 stamps so user completes
    for (const s of stampRows) {
      await h.db.insert(grants).values({ userId: user.id, stampId: s.id });
    }

    // Write Completion row (as if grantStamp had done it)
    await h.db.insert(completions).values({ userId: user.id });

    // Deactivate one stamp — card drops to 4 active, but Completion row persists
    await deactivateStamp(h.db, stampRows[0].id);

    const card = await getCard(h.db, user.id);
    expect(card.activeStamps).toHaveLength(4);
    expect(card.complete).toBe(false); // card now reflects 4/5

    // Completion row still exists in DB (it is never deleted)
    const completionRows = await h.db.select().from(completions);
    expect(completionRows).toHaveLength(1);
    expect(completionRows[0].userId).toBe(user.id);
  });
});
