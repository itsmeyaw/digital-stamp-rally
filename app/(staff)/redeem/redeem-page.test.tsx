/**
 * RedeemPage neo-brutalism redesign tests (issue #21).
 *
 * Asserts:
 *   1. Code input has min-h-[48px] class
 *   2. Code input is full-width (w-full)
 *   3. Code input has border-brutal class
 *   4. "Look up" button has border-brutal class
 *   5. "Look up" button has shadow-hard class
 *   6. "Look up" button has min-h-[48px] class
 *   7. Eligible result: shows "5/5" progress text and orange REDEEM button
 *   8. Orange REDEEM button has bg-[var(--color-secondary)] or inline #FF6600 style
 *   9. Blocked/not-yet-eligible result shows "N/5" progress text
 *  10. Already-redeemed result shows "Already redeemed" text
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import * as jestDomMatchers from "@testing-library/jest-dom/matchers";

expect.extend(jestDomMatchers);

afterEach(() => cleanup());

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

import RedeemPage from "./page";

const eligibleLookup = {
  status: "eligible" as const,
  activeStampCount: 5,
  completionExists: true,
  redemptionExists: false,
  card: { activeStamps: ["s1", "s2", "s3", "s4", "s5"], slots: [], complete: true, bonusCount: 0 },
};

const blockedLookup = {
  status: "blocked" as const,
  activeStampCount: 3,
  completionExists: false,
  redemptionExists: false,
  card: { activeStamps: ["s1", "s2", "s3"], slots: [], complete: false, bonusCount: 0 },
};

const alreadyRedeemedLookup = {
  status: "already_redeemed" as const,
  activeStampCount: 5,
  completionExists: true,
  redemptionExists: true,
  card: { activeStamps: ["s1", "s2", "s3", "s4", "s5"], slots: [], complete: true, bonusCount: 0 },
};

describe("RedeemPage — neo-brutalism redesign", () => {
  it("code input has min-h-[48px] class", () => {
    render(<RedeemPage />);
    const input = screen.getByRole("textbox");
    expect(input.className).toContain("min-h-[48px]");
  });

  it("code input is full-width (w-full class)", () => {
    render(<RedeemPage />);
    const input = screen.getByRole("textbox");
    expect(input.className).toContain("w-full");
  });

  it("code input has border-brutal class", () => {
    render(<RedeemPage />);
    const input = screen.getByRole("textbox");
    expect(input.className).toContain("border-brutal");
  });

  it("look-up button has border-brutal class", () => {
    render(<RedeemPage />);
    const btn = screen.getByRole("button", { name: /look\s*up/i });
    expect(btn.className).toContain("border-brutal");
  });

  it("look-up button has shadow-hard class", () => {
    render(<RedeemPage />);
    const btn = screen.getByRole("button", { name: /look\s*up/i });
    expect(btn.className).toContain("shadow-hard");
  });

  it("look-up button has min-h-[48px] class", () => {
    render(<RedeemPage />);
    const btn = screen.getByRole("button", { name: /look\s*up/i });
    expect(btn.className).toContain("min-h-[48px]");
  });

  it("eligible result shows '5/5' progress text", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => eligibleLookup,
    });

    render(<RedeemPage />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "ABC123" } });
    fireEvent.click(screen.getByRole("button", { name: /look\s*up/i }));

    await waitFor(() => {
      expect(screen.getByText(/5\/5/)).toBeInTheDocument();
    });
  });

  it("eligible result shows REDEEM button with orange styling", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => eligibleLookup,
    });

    render(<RedeemPage />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "ABC123" } });
    fireEvent.click(screen.getByRole("button", { name: /look\s*up/i }));

    await waitFor(() => {
      const redeemBtn = screen.getByRole("button", { name: /redeem prize/i });
      expect(redeemBtn).toBeInTheDocument();
      // Should have orange styling (either via Tailwind class or inline style)
      const hasOrangeClass =
        redeemBtn.className.includes("bg-[var(--color-secondary)]") ||
        redeemBtn.className.includes("bg-\\[\\#FF6600\\]") ||
        redeemBtn.className.includes("#FF6600");
      const hasOrangeStyle =
        redeemBtn.style.backgroundColor === "#FF6600" ||
        redeemBtn.style.backgroundColor === "rgb(255, 102, 0)";
      expect(hasOrangeClass || hasOrangeStyle).toBe(true);
    });
  });

  it("eligible result REDEEM button has border-brutal class", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => eligibleLookup,
    });

    render(<RedeemPage />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "ABC123" } });
    fireEvent.click(screen.getByRole("button", { name: /look\s*up/i }));

    await waitFor(() => {
      const redeemBtn = screen.getByRole("button", { name: /redeem prize/i });
      expect(redeemBtn.className).toContain("border-brutal");
    });
  });

  it("eligible result REDEEM button has min-h-[48px] class", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => eligibleLookup,
    });

    render(<RedeemPage />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "ABC123" } });
    fireEvent.click(screen.getByRole("button", { name: /look\s*up/i }));

    await waitFor(() => {
      const redeemBtn = screen.getByRole("button", { name: /redeem prize/i });
      expect(redeemBtn.className).toContain("min-h-[48px]");
    });
  });

  it("blocked result shows 'N/5' style progress (e.g. '3/5')", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => blockedLookup,
    });

    render(<RedeemPage />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "XYZ789" } });
    fireEvent.click(screen.getByRole("button", { name: /look\s*up/i }));

    await waitFor(() => {
      expect(screen.getByText(/3\/5/)).toBeInTheDocument();
    });
  });

  it("already-redeemed result shows 'Already redeemed' text", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => alreadyRedeemedLookup,
    });

    render(<RedeemPage />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "XYZ789" } });
    fireEvent.click(screen.getByRole("button", { name: /look\s*up/i }));

    await waitFor(() => {
      expect(screen.getByText(/already redeemed/i)).toBeInTheDocument();
    });
  });
});
