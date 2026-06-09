/**
 * @vitest-environment jsdom
 *
 * Welcome page — styling / structure assertions.
 *
 * The WelcomePage is an async Server Component so we can't render it directly
 * via @testing-library/react (it calls getSession which hits a real DB).
 * Instead we test the static markup it produces by importing the RSC output
 * through a lightweight wrapper, mocking Next.js server-only dependencies.
 *
 * Because the page only renders when session is null (redirect fires otherwise),
 * we mock getSession to return null and redirect to throw so tests see the real
 * render path.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import * as jestDomMatchers from "@testing-library/jest-dom/matchers";

expect.extend(jestDomMatchers);

// ── Next.js mocks ────────────────────────────────────────────────────────────
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

// ── App mocks ─────────────────────────────────────────────────────────────────
vi.mock("@/lib/auth/session", () => ({ getSession: vi.fn().mockResolvedValue(null) }));
vi.mock("@/lib/auth/landing", () => ({ resolveLanding: vi.fn() }));
vi.mock("@/lib/env", () => ({ eventName: vi.fn().mockReturnValue("Test") }));

// ── Subject ───────────────────────────────────────────────────────────────────
import WelcomePage from "./page";

// Render async RSC by awaiting the JSX result
async function renderWelcome() {
  const jsx = await WelcomePage();
  return render(jsx as React.ReactElement);
}

describe("WelcomePage — neo-brutalism structure", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders a primary action button (Collect stamp)", async () => {
    await renderWelcome();
    const link = screen.getByRole("link", { name: /collect stamp/i });
    expect(link).toBeInTheDocument();
  });

  it("the Collect stamp button links to /collect", async () => {
    await renderWelcome();
    const link = screen.getByRole("link", { name: /collect stamp/i });
    expect(link).toHaveAttribute("href", "/collect");
  });

  it("the Login button is present", async () => {
    await renderWelcome();
    expect(screen.getByRole("link", { name: /login/i })).toBeInTheDocument();
  });

  it("has no nav element (no navigation chrome)", async () => {
    await renderWelcome();
    expect(document.querySelector("nav")).toBeNull();
  });

  it("page has a bold heading", async () => {
    await renderWelcome();
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toBeInTheDocument();
  });
});
