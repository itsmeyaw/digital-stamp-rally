import { describe, it, expect, beforeEach } from "vitest";
import { getCard, SLOT_COUNT } from "./card";
import { setupTestDb } from "@/test/db-harness";
import { users, stamps, grants } from "@/lib/db/schema";

describe("getCard", () => {
  const h = setupTestDb();

  beforeEach(async () => {
    await h.db.delete(grants);
    await h.db.delete(stamps);
    await h.db.delete(users);
  });

  it("returns 5 empty slots, not complete, no bonus for a user with no stamps", async () => {
    const [user] = await h.db.insert(users).values({ code: "ZZZ999" }).returning();
    const card = await getCard(h.db, user.id);
    expect(SLOT_COUNT).toBe(5);
    expect(card.slots).toHaveLength(5);
    expect(card.slots.every((s) => s === null)).toBe(true);
    expect(card.complete).toBe(false);
    expect(card.bonusCount).toBe(0);
  });
});
