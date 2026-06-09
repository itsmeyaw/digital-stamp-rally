/**
 * @vitest-environment jsdom
 *
 * Collect page — styling / structure assertions.
 *
 * Tests the CollectButton client component directly (the interactive piece)
 * and the CollectPage RSC structure via mocks.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import * as jestDomMatchers from "@testing-library/jest-dom/matchers";

expect.extend(jestDomMatchers);

// ── Next.js mocks ─────────────────────────────────────────────────────────────
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  useRouter: vi.fn(() => ({
    replace: vi.fn(),
    refresh: vi.fn(),
  })),
}));

// ── App mocks ─────────────────────────────────────────────────────────────────
vi.mock("@/lib/auth/session", () => ({ getSession: vi.fn().mockResolvedValue(null) }));
vi.mock("@/lib/auth/landing", () => ({ resolveLanding: vi.fn() }));
vi.mock("@/lib/env", () => ({ eventName: vi.fn().mockReturnValue("Test") }));

// ── Subjects ──────────────────────────────────────────────────────────────────
import CollectPage from "./page";
import { CollectButton } from "./collect-button";

async function renderCollectPage() {
  const jsx = await CollectPage();
  return render(jsx as React.ReactElement);
}

// ── CollectPage RSC tests ─────────────────────────────────────────────────────
describe("CollectPage — neo-brutalism structure", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => cleanup());

  it("has no nav element (no navigation chrome)", async () => {
    await renderCollectPage();
    expect(document.querySelector("nav")).toBeNull();
  });

  it("renders a bold heading", async () => {
    await renderCollectPage();
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toBeInTheDocument();
  });
});

// ── CollectButton client component tests ─────────────────────────────────────
describe("CollectButton — primary action", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => cleanup());

  it("renders a button with label 'Start collecting'", () => {
    render(<CollectButton />);
    expect(screen.getByRole("button", { name: /start collecting/i })).toBeInTheDocument();
  });

  it("button is not disabled initially", () => {
    render(<CollectButton />);
    expect(screen.getByRole("button", { name: /start collecting/i })).not.toBeDisabled();
  });

  it("no nav element present", () => {
    render(<CollectButton />);
    expect(document.querySelector("nav")).toBeNull();
  });
});
