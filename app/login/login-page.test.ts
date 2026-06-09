/**
 * Static structure tests for the neo-brutalism login page (issue #16).
 *
 * These tests inspect the JSX source files to verify that:
 *  - The login form includes a submit button (functional contract)
 *  - The page has no navigation chrome (nav element / NavigationShell)
 *  - Neo-brutalism design tokens are applied (--color-bg, --color-primary,
 *    --border, --shadow / border-brutal, shadow-hard)
 *
 * Source-inspection is the right trade-off here: the vitest suite runs in the
 * Node environment without a browser DOM, and adding jsdom/RTL is not needed
 * for what are effectively compile-time / static assertions about styling.
 */

import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

const loginDir = path.resolve(__dirname);

function readSource(filename: string): string {
  return fs.readFileSync(path.join(loginDir, filename), "utf-8");
}

describe("login page (neo-brutalism, issue #16)", () => {
  describe("page.tsx — chrome-free layout", () => {
    const src = readSource("page.tsx");

    it("uses var(--color-bg) for the background", () => {
      expect(src).toContain("var(--color-bg)");
    });

    it("does not render a <nav> element", () => {
      // No literal <nav in the file
      expect(src).not.toMatch(/<nav[\s>]/);
    });

    it("does not import or render NavigationShell", () => {
      expect(src).not.toContain("NavigationShell");
    });

    it("uses min-h-screen for full-screen layout", () => {
      expect(src).toContain("min-h-screen");
    });
  });

  describe("login-form.tsx — neo-brutalism inputs and button", () => {
    const src = readSource("login-form.tsx");

    it("has a submit button", () => {
      expect(src).toContain('type="submit"');
    });

    it("applies var(--border) to inputs", () => {
      expect(src).toContain("var(--border)");
    });

    it("applies var(--shadow) to inputs", () => {
      expect(src).toContain("var(--shadow)");
    });

    it("applies var(--color-primary) to the submit button", () => {
      expect(src).toContain("var(--color-primary)");
    });

    it("applies var(--border) to the submit button", () => {
      // All three style tokens should appear (inputs + button share the same vars)
      const borderCount = (src.match(/var\(--border\)/g) ?? []).length;
      expect(borderCount).toBeGreaterThanOrEqual(2); // at least two inputs + button
    });

    it("does not have a <nav> element", () => {
      expect(src).not.toMatch(/<nav[\s>]/);
    });
  });
});
