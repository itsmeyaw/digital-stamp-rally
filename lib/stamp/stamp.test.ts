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

  it("uses default bgColor and textColor when not provided", async () => {
    const created = await createStamp(h.db, {
      name: "Tea",
      imageUrl: "https://blob.example/tea.png",
    });

    expect(created.bgColor).toBe("#0057FF");
    expect(created.textColor).toBe("#FFFFFF");
  });

  it("persists explicit bgColor and textColor when provided", async () => {
    const created = await createStamp(h.db, {
      name: "Juice",
      imageUrl: "https://blob.example/juice.png",
      bgColor: "#FF0000",
      textColor: "#000000",
    });

    expect(created.bgColor).toBe("#FF0000");
    expect(created.textColor).toBe("#000000");
  });
});
