import { describe, it, expect } from "vitest";
import { setupTestDb } from "@/test/db-harness";
import { createStamp, listStamps } from "./stamp";

const h = setupTestDb();

describe("createStamp / listStamps", () => {
  it("persists a created stamp and returns it from listStamps", async () => {
    const created = await createStamp(h.db, {
      name: "Coffee",
      imageUrl: "https://blob.example/coffee.png",
    });

    expect(created.id).toBeTruthy();
    expect(created.name).toBe("Coffee");
    expect(created.imageUrl).toBe("https://blob.example/coffee.png");
    expect(created.active).toBe(true);

    const all = await listStamps(h.db);
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe(created.id);
    expect(all[0].name).toBe("Coffee");
  });
});
