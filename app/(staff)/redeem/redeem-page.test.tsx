/**
 * RedeemPage tests — issue #21 (neo-brutalism) + issue #27 (deep-link auto-lookup).
 *
 * Neo-brutalism assertions (issue #21):
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
 *
 * Deep-link / auto-lookup assertions (issue #27):
 *  11. Auto-lookup on mount: ?code=ABC123 → GET fired immediately, status shown
 *  12. Tap-to-redeem: after auto-lookup shows eligible, clicking button fires POST
 *  13. Manual entry: no search param → input empty, Look up disabled until 6 chars
 *  14. Not-found: 404 on lookup shows friendly "User not found" message
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import * as jestDomMatchers from "@testing-library/jest-dom/matchers";

expect.extend(jestDomMatchers);

// Mock next/navigation before importing the component
vi.mock("next/navigation", () => ({
  useSearchParams: vi.fn(),
}));

import { useSearchParams } from "next/navigation";

afterEach(() => cleanup());

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
  // Default: no search params (manual entry mode)
  (useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue(new URLSearchParams(""));
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

describe("RedeemPage — deep-link auto-lookup (issue #27)", () => {
  it("auto-lookup on mount: ?code=ABC123 triggers GET and shows status", async () => {
    (useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue(
      new URLSearchParams("code=ABC123"),
    );
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => eligibleLookup,
    });

    render(<RedeemPage />);

    // fetch should be called automatically without any user interaction
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/redeem?code=ABC123"),
      );
    });

    // status card should appear
    await waitFor(() => {
      expect(screen.getByTestId("redeem-result-card")).toBeInTheDocument();
      expect(screen.getByText(/5\/5/)).toBeInTheDocument();
    });
  });

  it("auto-lookup normalises the code (trims + uppercases)", async () => {
    (useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue(
      new URLSearchParams("code=abc123"),
    );
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => eligibleLookup,
    });

    render(<RedeemPage />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/redeem?code=ABC123"),
      );
    });
  });

  it("tap-to-redeem: POST fires only on button click, not on mount", async () => {
    (useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue(
      new URLSearchParams("code=ABC123"),
    );
    // First call: auto-lookup GET
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => eligibleLookup,
    });
    // Second call: redeem POST
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ redeemed: true, alreadyRedeemed: false }),
    });

    render(<RedeemPage />);

    // Wait for auto-lookup to complete and show Redeem button
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /redeem prize/i })).toBeInTheDocument();
    });

    // POST should NOT have been called yet — only the GET
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).not.toHaveBeenCalledWith(
      "/api/redeem",
      expect.objectContaining({ method: "POST" }),
    );

    // Now tap the button
    fireEvent.click(screen.getByRole("button", { name: /redeem prize/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/redeem",
        expect.objectContaining({ method: "POST" }),
      );
    });
  });

  it("manual entry: input starts empty and Look up is disabled until 6 chars typed", () => {
    // No search params — manual mode
    (useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue(new URLSearchParams(""));

    render(<RedeemPage />);

    const input = screen.getByRole("textbox");
    const lookupBtn = screen.getByRole("button", { name: /look\s*up/i });

    // Input should be empty
    expect(input).toHaveValue("");

    // Button disabled with fewer than 6 chars
    fireEvent.change(input, { target: { value: "ABC" } });
    expect(lookupBtn).toBeDisabled();

    // Button enabled with exactly 6 chars
    fireEvent.change(input, { target: { value: "ABC123" } });
    expect(lookupBtn).not.toBeDisabled();
  });

  it("not-found: 404 on lookup shows friendly user-not-found message", async () => {
    (useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue(
      new URLSearchParams("code=BADC0D"),
    );
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({}),
    });

    render(<RedeemPage />);

    await waitFor(() => {
      expect(screen.getByText(/user not found/i)).toBeInTheDocument();
    });
  });
});
