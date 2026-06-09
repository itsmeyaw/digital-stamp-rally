import { describe, it, expect } from "vitest";
import {
  deriveCard,
  crossesCompletion,
  type Grant,
  type StampState,
} from "./card";

describe("deriveCard", () => {
  it("returns 5 empty slots, no active stamps, not complete for empty grants", () => {
    const result = deriveCard([], []);
    expect(result.slots).toEqual([null, null, null, null, null]);
    expect(result.activeStamps).toEqual([]);
    expect(result.complete).toBe(false);
    expect(result.bonusCount).toBe(0);
  });

  it("places one active stamp in slot 0 and lists it as active", () => {
    const grants: Grant[] = [
      { stampId: "coffee", acquiredAt: new Date("2026-06-01T10:00:00Z") },
    ];
    const states: StampState[] = [{ stampId: "coffee", active: true }];
    const result = deriveCard(grants, states);
    expect(result.activeStamps).toEqual(["coffee"]);
    expect(result.slots).toEqual(["coffee", null, null, null, null]);
    expect(result.complete).toBe(false);
    expect(result.bonusCount).toBe(0);
  });

  it("orders stamps by acquisition time regardless of input order", () => {
    const grants: Grant[] = [
      { stampId: "third", acquiredAt: new Date("2026-06-03T10:00:00Z") },
      { stampId: "first", acquiredAt: new Date("2026-06-01T10:00:00Z") },
      { stampId: "second", acquiredAt: new Date("2026-06-02T10:00:00Z") },
    ];
    const states: StampState[] = [
      { stampId: "first", active: true },
      { stampId: "second", active: true },
      { stampId: "third", active: true },
    ];
    const result = deriveCard(grants, states);
    expect(result.activeStamps).toEqual(["first", "second", "third"]);
    expect(result.slots).toEqual(["first", "second", "third", null, null]);
  });

  it("is complete with exactly 5 distinct active stamps", () => {
    const grants: Grant[] = ["a", "b", "c", "d", "e"].map((id, i) => ({
      stampId: id,
      acquiredAt: new Date(Date.UTC(2026, 5, i + 1)),
    }));
    const states: StampState[] = grants.map((g) => ({
      stampId: g.stampId,
      active: true,
    }));
    const result = deriveCard(grants, states);
    expect(result.slots).toEqual(["a", "b", "c", "d", "e"]);
    expect(result.complete).toBe(true);
    expect(result.bonusCount).toBe(0);
  });

  it("excludes deactivated stamps from order, slots and completion", () => {
    const grants: Grant[] = ["a", "b", "c", "d", "e", "f"].map((id, i) => ({
      stampId: id,
      acquiredAt: new Date(Date.UTC(2026, 5, i + 1)),
    }));
    // 6 grants but 2 deactivated => only 4 active => not complete.
    const states: StampState[] = [
      { stampId: "a", active: true },
      { stampId: "b", active: false },
      { stampId: "c", active: true },
      { stampId: "d", active: true },
      { stampId: "e", active: false },
      { stampId: "f", active: true },
    ];
    const result = deriveCard(grants, states);
    expect(result.activeStamps).toEqual(["a", "c", "d", "f"]);
    expect(result.slots).toEqual(["a", "c", "d", "f", null]);
    expect(result.complete).toBe(false);
    expect(result.bonusCount).toBe(0);
  });

  it("compacts left when a middle stamp is revoked (grant removed)", () => {
    // Original a..e; "c" was revoked => its grant record is simply gone.
    const grants: Grant[] = ["a", "b", "d", "e"].map((id) => ({
      stampId: id,
      acquiredAt: new Date(
        Date.UTC(2026, 5, { a: 1, b: 2, d: 4, e: 5 }[id]!),
      ),
    }));
    const states: StampState[] = grants.map((g) => ({
      stampId: g.stampId,
      active: true,
    }));
    const result = deriveCard(grants, states);
    // No gap where "c" used to be; later stamps shift left.
    expect(result.slots).toEqual(["a", "b", "d", "e", null]);
    expect(result.complete).toBe(false);
  });

  it("compacts left when a middle stamp is deactivated", () => {
    const grants: Grant[] = ["a", "b", "c", "d", "e"].map((id, i) => ({
      stampId: id,
      acquiredAt: new Date(Date.UTC(2026, 5, i + 1)),
    }));
    const states: StampState[] = [
      { stampId: "a", active: true },
      { stampId: "b", active: true },
      { stampId: "c", active: false },
      { stampId: "d", active: true },
      { stampId: "e", active: true },
    ];
    const result = deriveCard(grants, states);
    expect(result.slots).toEqual(["a", "b", "d", "e", null]);
    expect(result.complete).toBe(false);
  });

  it("counts stamps beyond the 5th as bonus, shows only 5 slots, stays complete", () => {
    const grants: Grant[] = ["a", "b", "c", "d", "e", "f", "g"].map(
      (id, i) => ({
        stampId: id,
        acquiredAt: new Date(Date.UTC(2026, 5, i + 1)),
      }),
    );
    const states: StampState[] = grants.map((g) => ({
      stampId: g.stampId,
      active: true,
    }));
    const result = deriveCard(grants, states);
    expect(result.slots).toEqual(["a", "b", "c", "d", "e"]);
    expect(result.slots).toHaveLength(5);
    expect(result.activeStamps).toEqual([
      "a",
      "b",
      "c",
      "d",
      "e",
      "f",
      "g",
    ]);
    expect(result.complete).toBe(true);
    expect(result.bonusCount).toBe(2);
  });

  it("collapses duplicate grants of the same stamp to its earliest acquisition", () => {
    const grants: Grant[] = [
      { stampId: "x", acquiredAt: new Date("2026-06-05T10:00:00Z") },
      { stampId: "y", acquiredAt: new Date("2026-06-02T10:00:00Z") },
      // duplicate of x, earlier than the first x record
      { stampId: "x", acquiredAt: new Date("2026-06-01T10:00:00Z") },
    ];
    const states: StampState[] = [
      { stampId: "x", active: true },
      { stampId: "y", active: true },
    ];
    const result = deriveCard(grants, states);
    // x's earliest acquisition (Jun 1) precedes y (Jun 2), so x is first.
    expect(result.activeStamps).toEqual(["x", "y"]);
    expect(result.slots).toEqual(["x", "y", null, null, null]);
  });
});

describe("crossesCompletion", () => {
  const fiveActive: StampState[] = ["a", "b", "c", "d", "e"].map((id) => ({
    stampId: id,
    active: true,
  }));

  const grant = (id: string, day: number): Grant => ({
    stampId: id,
    acquiredAt: new Date(Date.UTC(2026, 5, day)),
  });

  it("is true when a grant takes the user from 4 to 5 distinct active (first crossing)", () => {
    const before: Grant[] = [
      grant("a", 1),
      grant("b", 2),
      grant("c", 3),
      grant("d", 4),
    ];
    const after: Grant[] = [...before, grant("e", 5)];
    expect(crossesCompletion(before, after, fiveActive)).toBe(true);
  });

  it("is false when already complete before the transition", () => {
    const before: Grant[] = ["a", "b", "c", "d", "e"].map((id, i) =>
      grant(id, i + 1),
    );
    const sixStates: StampState[] = [
      ...fiveActive,
      { stampId: "f", active: true },
    ];
    const after: Grant[] = [...before, grant("f", 6)];
    expect(crossesCompletion(before, after, sixStates)).toBe(false);
  });

  it("is false when the transition stays below 5 active", () => {
    const before: Grant[] = [grant("a", 1), grant("b", 2)];
    const after: Grant[] = [...before, grant("c", 3)];
    expect(crossesCompletion(before, after, fiveActive)).toBe(false);
  });

  it("returns true again on a re-cross (4 -> 5) since it is a stateless snapshot predicate", () => {
    // Models the second half of a 5 -> 4 -> 5 sequence: write-once is the
    // consumer's job; the predicate itself only compares the two snapshots.
    const before: Grant[] = [
      grant("a", 1),
      grant("b", 2),
      grant("c", 3),
      grant("d", 4),
    ];
    const after: Grant[] = [...before, grant("e", 5)];
    expect(crossesCompletion(before, after, fiveActive)).toBe(true);
  });

  it("does not cross when the 5th stamp added is deactivated (still 4 active)", () => {
    const before: Grant[] = [
      grant("a", 1),
      grant("b", 2),
      grant("c", 3),
      grant("d", 4),
    ];
    const after: Grant[] = [...before, grant("e", 5)];
    const states: StampState[] = [
      { stampId: "a", active: true },
      { stampId: "b", active: true },
      { stampId: "c", active: true },
      { stampId: "d", active: true },
      { stampId: "e", active: false },
    ];
    expect(crossesCompletion(before, after, states)).toBe(false);
  });
});
