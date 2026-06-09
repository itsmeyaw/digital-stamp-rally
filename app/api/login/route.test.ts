import { describe, it, expect, beforeAll } from "vitest";
import { setupTestDb } from "@/test/db-harness";
import { staff } from "@/lib/db/schema";
import { hashPassword } from "@/lib/auth/password";
import { SESSION_COOKIE_NAME, readSession } from "@/lib/auth/session";

const h = setupTestDb();

beforeAll(async () => {
  process.env.SESSION_SECRET = "route-test-secret";
  globalThis.__dsrDb = h.db;

  // Seed one staff of each role with known passwords.
  await h.db.insert(staff).values([
    {
      username: "stamper1",
      passwordHash: await hashPassword("stamp-pw"),
      role: "stamper",
    },
    {
      username: "redeemer1",
      passwordHash: await hashPassword("redeem-pw"),
      role: "redeemer",
    },
    {
      username: "admin1",
      passwordHash: await hashPassword("admin-pw"),
      role: "admin",
    },
  ]);
});

async function postLogin(body: unknown) {
  const { POST } = await import("./route");
  return POST(
    new Request("http://localhost/api/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

function cookieValue(res: Response): string | null {
  const setCookie = res.headers.get("set-cookie") ?? "";
  if (!setCookie.includes(`${SESSION_COOKIE_NAME}=`)) return null;
  const raw = setCookie.split(`${SESSION_COOKIE_NAME}=`)[1].split(";")[0];
  return decodeURIComponent(raw);
}

describe("POST /api/login", () => {
  it("logs an admin in: sets httpOnly cookie with admin claims and returns /admin landing", async () => {
    const res = await postLogin({ username: "admin1", password: "admin-pw" });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.landing).toBe("/admin");

    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain(`${SESSION_COOKIE_NAME}=`);
    expect(setCookie.toLowerCase()).toContain("httponly");

    const claims = readSession(cookieValue(res));
    expect(claims?.role).toBe("admin");
    expect(typeof claims?.sub).toBe("string");
  });

  it("routes a stamper to /scan and a redeemer to /redeem", async () => {
    const stamperRes = await postLogin({
      username: "stamper1",
      password: "stamp-pw",
    });
    expect((await stamperRes.json()).landing).toBe("/scan");
    expect(readSession(cookieValue(stamperRes))?.role).toBe("stamper");

    const redeemerRes = await postLogin({
      username: "redeemer1",
      password: "redeem-pw",
    });
    expect((await redeemerRes.json()).landing).toBe("/redeem");
    expect(readSession(cookieValue(redeemerRes))?.role).toBe("redeemer");
  });

  it("rejects a wrong password with 401 and no cookie", async () => {
    const res = await postLogin({ username: "admin1", password: "nope" });
    expect(res.status).toBe(401);
    expect(cookieValue(res)).toBeNull();
  });

  it("rejects an unknown username with 401 and no cookie", async () => {
    const res = await postLogin({ username: "ghost", password: "whatever" });
    expect(res.status).toBe(401);
    expect(cookieValue(res)).toBeNull();
  });

  it("rejects a missing/invalid body with 400", async () => {
    const { POST } = await import("./route");
    const res = await POST(
      new Request("http://localhost/api/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "not json",
      }),
    );
    expect(res.status).toBe(400);
  });
});
