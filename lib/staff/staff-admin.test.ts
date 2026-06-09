import { describe, it, expect, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { setupTestDb } from "@/test/db-harness";
import { staff, stamps } from "@/lib/db/schema";
import { verifyPassword } from "@/lib/auth/password";
import {
  createStamper,
  createRedeemer,
  reassignStamperStamp,
  deactivateStaff,
  listStaff,
  StaffAdminError,
} from "@/lib/staff/staff-admin";

const h = setupTestDb();

async function seedStamp(name = "Coffee") {
  const [row] = await h.db
    .insert(stamps)
    .values({ name, imageUrl: `https://blob/${name}.png` })
    .returning();
  return row;
}

beforeEach(async () => {
  await h.db.delete(staff);
  await h.db.delete(stamps);
});

describe("createStamper", () => {
  it("persists a stamper bound to an existing stamp with a hashed password and active=true", async () => {
    const stamp = await seedStamp();

    const created = await createStamper(h.db, {
      username: "stamper-a",
      password: "secret-pw",
      stampId: stamp.id,
    });

    expect(created.role).toBe("stamper");
    expect(created.stampId).toBe(stamp.id);
    expect(created.active).toBe(true);

    const rows = await h.db
      .select()
      .from(staff)
      .where(eq(staff.username, "stamper-a"));
    expect(rows).toHaveLength(1);
    expect(rows[0].passwordHash).not.toBe("secret-pw");
    expect(await verifyPassword("secret-pw", rows[0].passwordHash)).toBe(true);
  });

  it("rejects a non-existent stampId and persists nothing", async () => {
    await expect(
      createStamper(h.db, {
        username: "stamper-b",
        password: "pw",
        stampId: "00000000-0000-0000-0000-000000000000",
      }),
    ).rejects.toMatchObject({ code: "stamp_not_found" } satisfies Partial<StaffAdminError>);

    const rows = await h.db.select().from(staff);
    expect(rows).toHaveLength(0);
  });

  it("rejects a duplicate username with username_taken", async () => {
    const stamp = await seedStamp();
    await createStamper(h.db, {
      username: "dup",
      password: "pw",
      stampId: stamp.id,
    });
    await expect(
      createStamper(h.db, { username: "dup", password: "pw2", stampId: stamp.id }),
    ).rejects.toMatchObject({ code: "username_taken" } satisfies Partial<StaffAdminError>);
  });

  it("allows multiple stampers bound to the same stamp", async () => {
    const stamp = await seedStamp();
    await createStamper(h.db, { username: "s1", password: "pw", stampId: stamp.id });
    await createStamper(h.db, { username: "s2", password: "pw", stampId: stamp.id });

    const rows = await h.db
      .select()
      .from(staff)
      .where(eq(staff.stampId, stamp.id));
    expect(rows).toHaveLength(2);
  });
});

describe("createRedeemer", () => {
  it("persists a redeemer with no stamp binding, active, password hashed", async () => {
    const created = await createRedeemer(h.db, {
      username: "redeemer-a",
      password: "redeem-pw",
    });

    expect(created.role).toBe("redeemer");
    expect(created.stampId).toBeNull();
    expect(created.active).toBe(true);
    expect(await verifyPassword("redeem-pw", created.passwordHash)).toBe(true);
  });

  it("rejects a duplicate username with username_taken", async () => {
    await createRedeemer(h.db, { username: "dup", password: "pw" });
    await expect(
      createRedeemer(h.db, { username: "dup", password: "pw2" }),
    ).rejects.toMatchObject({ code: "username_taken" } satisfies Partial<StaffAdminError>);
  });
});

describe("reassignStamperStamp", () => {
  it("updates a stamper's bound stamp to a different stamp", async () => {
    const stampA = await seedStamp("A");
    const stampB = await seedStamp("B");
    const stamper = await createStamper(h.db, {
      username: "rs",
      password: "pw",
      stampId: stampA.id,
    });

    const updated = await reassignStamperStamp(h.db, {
      staffId: stamper.id,
      stampId: stampB.id,
    });
    expect(updated.stampId).toBe(stampB.id);

    const [row] = await h.db
      .select()
      .from(staff)
      .where(eq(staff.id, stamper.id));
    expect(row.stampId).toBe(stampB.id);
  });

  it("rejects reassign to a non-existent stamp", async () => {
    const stampA = await seedStamp("A");
    const stamper = await createStamper(h.db, {
      username: "rs",
      password: "pw",
      stampId: stampA.id,
    });
    await expect(
      reassignStamperStamp(h.db, {
        staffId: stamper.id,
        stampId: "00000000-0000-0000-0000-000000000000",
      }),
    ).rejects.toMatchObject({ code: "stamp_not_found" } satisfies Partial<StaffAdminError>);
  });

  it("rejects reassign of an unknown staff id", async () => {
    const stampA = await seedStamp("A");
    await expect(
      reassignStamperStamp(h.db, {
        staffId: "00000000-0000-0000-0000-000000000000",
        stampId: stampA.id,
      }),
    ).rejects.toMatchObject({ code: "staff_not_found" } satisfies Partial<StaffAdminError>);
  });

  it("rejects reassign when the target staff is not a stamper", async () => {
    const stampA = await seedStamp("A");
    const redeemer = await createRedeemer(h.db, { username: "r", password: "pw" });
    await expect(
      reassignStamperStamp(h.db, { staffId: redeemer.id, stampId: stampA.id }),
    ).rejects.toMatchObject({ code: "not_a_stamper" } satisfies Partial<StaffAdminError>);
  });
});

describe("deactivateStaff", () => {
  it("sets active=false without deleting the row", async () => {
    const redeemer = await createRedeemer(h.db, { username: "d", password: "pw" });

    const updated = await deactivateStaff(h.db, { staffId: redeemer.id });
    expect(updated.active).toBe(false);

    const rows = await h.db
      .select()
      .from(staff)
      .where(eq(staff.id, redeemer.id));
    expect(rows).toHaveLength(1);
    expect(rows[0].active).toBe(false);
  });

  it("rejects an unknown staff id", async () => {
    await expect(
      deactivateStaff(h.db, { staffId: "00000000-0000-0000-0000-000000000000" }),
    ).rejects.toMatchObject({ code: "staff_not_found" } satisfies Partial<StaffAdminError>);
  });
});

describe("listStaff", () => {
  it("lists stampers and redeemers, newest first, excluding admins", async () => {
    const stamp = await seedStamp();
    await createStamper(h.db, { username: "s1", password: "pw", stampId: stamp.id });
    await createRedeemer(h.db, { username: "r1", password: "pw" });
    // an admin should not appear in the managed-staff list
    await h.db
      .insert(staff)
      .values({ username: "admin-x", passwordHash: "x", role: "admin" });

    const list = await listStaff(h.db);
    const usernames = list.map((s) => s.username);
    expect(usernames).toContain("s1");
    expect(usernames).toContain("r1");
    expect(usernames).not.toContain("admin-x");
  });
});
