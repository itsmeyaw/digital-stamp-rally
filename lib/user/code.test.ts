import { describe, it, expect } from "vitest";
import { CROCKFORD_ALPHABET, generateCode } from "./code";

describe("generateCode", () => {
  it("returns a 6-character code drawn only from the confusable-free Crockford alphabet", () => {
    const code = generateCode();
    expect(code).toHaveLength(6);
    for (const ch of code) {
      expect(CROCKFORD_ALPHABET).toContain(ch);
    }
  });

  it("excludes the confusable characters I, L, O, U", () => {
    expect(CROCKFORD_ALPHABET).not.toMatch(/[ILOU]/);
    // alphabet is A-Z + 2-9 minus I,L,O,U => 26 - 4 letters + 8 digits = 30 symbols
    expect(CROCKFORD_ALPHABET).toHaveLength(30);
  });
});
