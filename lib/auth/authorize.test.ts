import { describe, it, expect } from "vitest";
import { requireRole } from "./authorize";
import type { TokenClaims } from "./token";

function session(role: TokenClaims["role"]): TokenClaims {
  return { sub: "x", role, iat: 0, exp: 0 };
}

describe("requireRole", () => {
  it("allows a session whose role matches", () => {
    expect(requireRole(session("admin"), "admin")).toBe(true);
    expect(requireRole(session("stamper"), "stamper")).toBe(true);
  });

  it("rejects a session with a different role (stamper cannot act as admin)", () => {
    expect(requireRole(session("stamper"), "admin")).toBe(false);
    expect(requireRole(session("redeemer"), "admin")).toBe(false);
    expect(requireRole(session("user"), "admin")).toBe(false);
  });

  it("rejects a null session", () => {
    expect(requireRole(null, "admin")).toBe(false);
  });
});
