import { describe, it, expect, beforeAll } from "vitest";
import { eq } from "drizzle-orm";
import { setupTestDb } from "@/test/db-harness";
import { staff } from "@/lib/db/schema";
import { seedAdmin } from "./seed";
import { verifyPassword } from "./password";

const h = setupTestDb();

beforeAll(() => {
  process.env.SESSION_SECRET = "seed-test-secret";
});

describe("seedAdmin", () => {
  it("creates the first admin with a hashed password", async () => {
    const created = await seedAdmin(h.db, {
      username: "root",
      password: "s3cret-pw",
    });
    expect(created.role).toBe("admin");
    expect(created.username).toBe("root");

    const rows = await h.db
      .select()
      .from(staff)
      .where(eq(staff.username, "root"));
    expect(rows).toHaveLength(1);
    // Plaintext is never stored; the stored hash verifies.
    expect(rows[0].passwordHash).not.toContain("s3cret-pw");
    expect(await verifyPassword("s3cret-pw", rows[0].passwordHash)).toBe(true);
  });

  it("is idempotent: a second call does not create a duplicate", async () => {
    const first = await seedAdmin(h.db, {
      username: "admin",
      password: "pw-one",
    });
    const second = await seedAdmin(h.db, {
      username: "admin",
      password: "pw-two",
    });

    expect(second.id).toBe(first.id);
    const rows = await h.db
      .select()
      .from(staff)
      .where(eq(staff.username, "admin"));
    expect(rows).toHaveLength(1);
    // The original password is preserved; re-seeding does not reset it.
    expect(await verifyPassword("pw-one", rows[0].passwordHash)).toBe(true);
    expect(await verifyPassword("pw-two", rows[0].passwordHash)).toBe(false);
  });
});
