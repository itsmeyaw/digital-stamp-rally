import { describe, it, expect } from "vitest";
import { resolveDeepLink } from "./deep-link-router";
import type { TokenClaims } from "./token";

const makeSession = (role: TokenClaims["role"]): TokenClaims => ({
  sub: "test-id",
  role,
  iat: 0,
  exp: 9_999_999_999,
});

describe("resolveDeepLink", () => {
  it("redirects unauthenticated visitors to login with returnTo", () => {
    expect(
      resolveDeepLink({ session: null, code: "ABC123", stamperHasBoundStamp: false }),
    ).toBe("/login?returnTo=/s/ABC123");
  });

  it("routes a user to /card (code is not appended)", () => {
    expect(
      resolveDeepLink({
        session: makeSession("user"),
        code: "ABC123",
        stamperHasBoundStamp: false,
      }),
    ).toBe("/card");
  });

  it("routes a stamper with a bound stamp to /scan with code", () => {
    expect(
      resolveDeepLink({
        session: makeSession("stamper"),
        code: "XYZ789",
        stamperHasBoundStamp: true,
      }),
    ).toBe("/scan?code=XYZ789");
  });

  it("returns 'degraded' for a stamper with no bound stamp", () => {
    expect(
      resolveDeepLink({
        session: makeSession("stamper"),
        code: "XYZ789",
        stamperHasBoundStamp: false,
      }),
    ).toBe("degraded");
  });

  it("routes a redeemer to /redeem with code", () => {
    expect(
      resolveDeepLink({
        session: makeSession("redeemer"),
        code: "CODE42",
        stamperHasBoundStamp: false,
      }),
    ).toBe("/redeem?code=CODE42");
  });

  it("routes an admin to /redeem with code", () => {
    expect(
      resolveDeepLink({
        session: makeSession("admin"),
        code: "CODE42",
        stamperHasBoundStamp: false,
      }),
    ).toBe("/redeem?code=CODE42");
  });
});
