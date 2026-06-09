import { describe, it, expect } from "vitest";
import { getCard, SLOT_COUNT } from "./card";

describe("getCard", () => {
  it("returns 5 empty slots, not complete, no bonus for a user with no stamps", () => {
    const card = getCard({ sub: "user-1", role: "user", iat: 0, exp: 1 });
    expect(SLOT_COUNT).toBe(5);
    expect(card.slots).toHaveLength(5);
    expect(card.slots.every((s) => s === null)).toBe(true);
    expect(card.complete).toBe(false);
    expect(card.bonusCount).toBe(0);
  });
});
