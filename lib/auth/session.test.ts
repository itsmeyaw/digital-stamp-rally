import { describe, it, expect, beforeEach } from "vitest";
import {
  SESSION_COOKIE_NAME,
  buildSessionCookie,
  readSession,
} from "./session";

const SECRET = "unit-test-secret";

describe("session cookie", () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = SECRET;
    delete process.env.SESSION_TTL_SECONDS;
  });

  it("builds an httpOnly, long-lived session cookie for a user", () => {
    const cookie = buildSessionCookie({ sub: "user-1", role: "user" });
    expect(cookie.name).toBe(SESSION_COOKIE_NAME);
    expect(cookie.value.length).toBeGreaterThan(0);
    expect(cookie.options.httpOnly).toBe(true);
    expect(cookie.options.sameSite).toBe("lax");
    expect(cookie.options.path).toBe("/");
    // long-lived per ADR-0001 (>= 24h)
    expect(cookie.options.maxAge).toBeGreaterThanOrEqual(24 * 60 * 60);
  });

  it("readSession returns claims for a valid cookie value and null otherwise", () => {
    const cookie = buildSessionCookie({ sub: "user-1", role: "user" });
    const claims = readSession(cookie.value);
    expect(claims?.sub).toBe("user-1");
    expect(claims?.role).toBe("user");

    expect(readSession(undefined)).toBeNull();
    expect(readSession("tampered.value")).toBeNull();
  });
});
