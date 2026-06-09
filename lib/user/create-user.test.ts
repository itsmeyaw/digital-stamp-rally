import { describe, it, expect } from "vitest";
import { setupTestDb } from "@/test/db-harness";
import { createUser } from "./create-user";
import { CROCKFORD_ALPHABET } from "./code";
import { users } from "@/lib/db/schema";

describe("createUser", () => {
  const h = setupTestDb();

  it("persists a new User with a unique 6-char Crockford code and returns it", async () => {
    const user = await createUser(h.db);

    expect(user.code).toHaveLength(6);
    for (const ch of user.code) {
      expect(CROCKFORD_ALPHABET).toContain(ch);
    }
    expect(user.id).toMatch(/^[0-9a-f-]{36}$/);

    const rows = await h.db.select().from(users);
    expect(rows).toHaveLength(1);
    expect(rows[0].code).toBe(user.code);
  });

  it("issues distinct codes across many users (uniqueness holds)", async () => {
    const codes = new Set<string>();
    for (let i = 0; i < 25; i++) {
      const u = await createUser(h.db);
      codes.add(u.code);
    }
    // 25 here + 1 from the previous test in the same file's DB.
    const rows = await h.db.select().from(users);
    expect(rows.length).toBe(26);
    expect(codes.size).toBe(25);
  });
});
