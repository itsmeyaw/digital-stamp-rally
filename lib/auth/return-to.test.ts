import { describe, it, expect } from "vitest";
import { sanitizeReturnTo } from "./return-to";

describe("sanitizeReturnTo", () => {
  describe("safe relative paths — returned as-is", () => {
    it("allows /scan", () => {
      expect(sanitizeReturnTo("/scan", "/welcome")).toBe("/scan");
    });

    it("allows /scan with query string", () => {
      expect(sanitizeReturnTo("/scan?code=ABC123", "/welcome")).toBe(
        "/scan?code=ABC123",
      );
    });

    it("allows /redeem", () => {
      expect(sanitizeReturnTo("/redeem", "/welcome")).toBe("/redeem");
    });

    it("allows /admin/stamps", () => {
      expect(sanitizeReturnTo("/admin/stamps", "/welcome")).toBe(
        "/admin/stamps",
      );
    });

    it("allows /card", () => {
      expect(sanitizeReturnTo("/card", "/welcome")).toBe("/card");
    });
  });

  describe("unsafe / rejected values — fallback returned", () => {
    it("rejects https:// absolute URL", () => {
      expect(sanitizeReturnTo("https://evil.com", "/welcome")).toBe("/welcome");
    });

    it("rejects http:// absolute URL", () => {
      expect(sanitizeReturnTo("http://evil.com", "/welcome")).toBe("/welcome");
    });

    it("rejects protocol-relative //evil.com", () => {
      expect(sanitizeReturnTo("//evil.com", "/welcome")).toBe("/welcome");
    });

    it("rejects backslash trick /\\evil", () => {
      expect(sanitizeReturnTo("/\\evil", "/welcome")).toBe("/welcome");
    });

    it("rejects javascript: URI", () => {
      expect(sanitizeReturnTo("javascript:alert(1)", "/welcome")).toBe(
        "/welcome",
      );
    });

    it("rejects ftp:// URI", () => {
      expect(sanitizeReturnTo("ftp://host", "/welcome")).toBe("/welcome");
    });

    it("rejects empty string", () => {
      expect(sanitizeReturnTo("", "/welcome")).toBe("/welcome");
    });

    it("rejects null", () => {
      expect(sanitizeReturnTo(null, "/welcome")).toBe("/welcome");
    });

    it("rejects undefined", () => {
      expect(sanitizeReturnTo(undefined, "/welcome")).toBe("/welcome");
    });
  });

  describe("fallback value", () => {
    it("returns the provided fallback on rejection", () => {
      expect(sanitizeReturnTo("https://evil.com", "/card")).toBe("/card");
    });

    it("returns the provided fallback for empty string", () => {
      expect(sanitizeReturnTo("", "/scan")).toBe("/scan");
    });
  });
});
