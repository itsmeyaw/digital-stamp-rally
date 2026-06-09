import { describe, it, expect } from "vitest";
import { buildDeepLinkUrl } from "./deep-link";

describe("buildDeepLinkUrl", () => {
  it("happy path: builds a deep-link URL for a 6-char code", () => {
    expect(buildDeepLinkUrl("https://app.example", "ABC123")).toBe(
      "https://app.example/s/ABC123"
    );
  });

  it("strips trailing slash from base before appending path", () => {
    expect(buildDeepLinkUrl("https://app.example/", "ABC123")).toBe(
      "https://app.example/s/ABC123"
    );
  });

  it("works with a short (1-char) code", () => {
    expect(buildDeepLinkUrl("https://app.example", "X")).toBe(
      "https://app.example/s/X"
    );
  });

  it("works with a long code", () => {
    const longCode = "ABCDEFGHIJ1234567890";
    expect(buildDeepLinkUrl("https://app.example", longCode)).toBe(
      `https://app.example/s/${longCode}`
    );
  });
});
