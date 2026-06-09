import { describe, it, expect } from "vitest";
import { setupTestDb } from "@/test/db-harness";
import { createUser } from "./create-user";
import { getUserById } from "./get-user";

describe("getUserById", () => {
  const h = setupTestDb();

  it("returns the persisted user for a known id and null for an unknown id", async () => {
    const created = await createUser(h.db);
    const found = await getUserById(h.db, created.id);
    expect(found?.id).toBe(created.id);
    expect(found?.code).toBe(created.code);

    const missing = await getUserById(
      h.db,
      "00000000-0000-0000-0000-000000000000",
    );
    expect(missing).toBeNull();
  });
});
