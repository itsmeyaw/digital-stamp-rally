import { describe, it, expect } from "vitest";
import { signToken, verifyToken } from "./token";

const SECRET = "test-secret-please-change";

describe("session token", () => {
  it("round-trips: a signed token verifies back to its claims", () => {
    const token = signToken(
      { sub: "user-123", role: "user" },
      { secret: SECRET, ttlSeconds: 3600 },
    );
    const claims = verifyToken(token, { secret: SECRET });
    expect(claims).not.toBeNull();
    expect(claims!.sub).toBe("user-123");
    expect(claims!.role).toBe("user");
    expect(typeof claims!.iat).toBe("number");
    expect(typeof claims!.exp).toBe("number");
    expect(claims!.exp).toBeGreaterThan(claims!.iat);
  });

  it("rejects a token whose payload was tampered with", () => {
    const token = signToken(
      { sub: "user-123", role: "user" },
      { secret: SECRET, ttlSeconds: 3600 },
    );
    const [payload, sig] = token.split(".");
    // Flip a character in the payload while keeping the original signature.
    const tamperedPayload = payload.slice(0, -1) + (payload.endsWith("A") ? "B" : "A");
    expect(verifyToken(`${tamperedPayload}.${sig}`, { secret: SECRET })).toBeNull();
  });

  it("rejects a token signed with a different secret", () => {
    const token = signToken(
      { sub: "user-123", role: "user" },
      { secret: SECRET, ttlSeconds: 3600 },
    );
    expect(verifyToken(token, { secret: "a-different-secret" })).toBeNull();
  });

  it("rejects an expired token", () => {
    const issuedAt = 1_000_000;
    const token = signToken(
      { sub: "user-123", role: "user" },
      { secret: SECRET, ttlSeconds: 60, now: issuedAt },
    );
    // 61 seconds later — past the 60s TTL.
    expect(verifyToken(token, { secret: SECRET, now: issuedAt + 61 })).toBeNull();
    // still valid one second before expiry.
    expect(verifyToken(token, { secret: SECRET, now: issuedAt + 59 })).not.toBeNull();
  });

  it("rejects malformed tokens", () => {
    expect(verifyToken("", { secret: SECRET })).toBeNull();
    expect(verifyToken("garbage", { secret: SECRET })).toBeNull();
    expect(verifyToken("a.b.c", { secret: SECRET })).toBeNull();
  });
});
