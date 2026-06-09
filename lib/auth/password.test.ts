import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password hashing", () => {
  it("verifies a password against its own hash", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(await verifyPassword("correct horse battery staple", hash)).toBe(
      true,
    );
  });

  it("rejects a wrong password", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(await verifyPassword("Tr0ub4dor&3", hash)).toBe(false);
  });

  it("does not store the plaintext in the hash", async () => {
    const hash = await hashPassword("hunter2");
    expect(hash).not.toContain("hunter2");
    expect(hash.length).toBeGreaterThan(20);
  });
});
