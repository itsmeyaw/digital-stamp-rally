import { describe, it, expect } from "vitest";
import { resolveLanding } from "./landing";

describe("resolveLanding", () => {
  it("sends a user with a valid session to the card", () => {
    expect(
      resolveLanding({ sub: "u1", role: "user", iat: 0, exp: 9_999_999_999 }),
    ).toBe("/card");
  });

  it("sends a visitor with no session to the welcome screen", () => {
    expect(resolveLanding(null)).toBe("/welcome");
  });

  it("routes staff roles to their own surfaces (forward-compatible)", () => {
    expect(
      resolveLanding({ sub: "s1", role: "stamper", iat: 0, exp: 9e9 }),
    ).toBe("/scan");
    expect(
      resolveLanding({ sub: "a1", role: "admin", iat: 0, exp: 9e9 }),
    ).toBe("/admin");
    expect(
      resolveLanding({ sub: "r1", role: "redeemer", iat: 0, exp: 9e9 }),
    ).toBe("/redeem");
  });
});
