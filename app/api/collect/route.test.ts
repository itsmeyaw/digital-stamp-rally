import { describe, it, expect, beforeAll } from "vitest";
import { setupTestDb } from "@/test/db-harness";
import { users } from "@/lib/db/schema";
import { CROCKFORD_ALPHABET } from "@/lib/user/code";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { readSession } from "@/lib/auth/session";

const h = setupTestDb();

beforeAll(() => {
  process.env.SESSION_SECRET = "route-test-secret";
  // Make the route handler use the harness DB.
  globalThis.__dsrDb = h.db;
});

async function postCollect() {
  const { POST } = await import("./route");
  return POST(new Request("http://localhost/api/collect", { method: "POST" }));
}

describe("POST /api/collect", () => {
  it("creates a User with a unique 6-char code and sets an httpOnly session cookie", async () => {
    const res = await postCollect();
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.code).toHaveLength(6);
    for (const ch of body.code) {
      expect(CROCKFORD_ALPHABET).toContain(ch);
    }

    // User row persisted.
    const rows = await h.db.select().from(users);
    expect(rows).toHaveLength(1);
    expect(rows[0].code).toBe(body.code);

    // Session cookie set, httpOnly, and authenticates as the new user.
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain(`${SESSION_COOKIE_NAME}=`);
    expect(setCookie.toLowerCase()).toContain("httponly");
    expect(setCookie.toLowerCase()).toContain("path=/");

    const value = setCookie.split(`${SESSION_COOKIE_NAME}=`)[1].split(";")[0];
    const claims = readSession(decodeURIComponent(value));
    expect(claims?.role).toBe("user");
    expect(claims?.sub).toBe(rows[0].id);
  });

  it("issues distinct codes on repeated collects", async () => {
    const a = await (await postCollect()).json();
    const b = await (await postCollect()).json();
    expect(a.code).not.toBe(b.code);
  });
});
