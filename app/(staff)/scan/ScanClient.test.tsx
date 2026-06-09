/**
 * ScanClient neo-brutalism redesign tests (issue #21).
 *
 * Asserts:
 *   1. Manual code input has min-h-[48px] class (mobile tap target)
 *   2. Manual code input is full-width (w-full class)
 *   3. Manual code input has border-brutal class
 *   4. Submit button has border-brutal class
 *   5. Submit button has shadow-hard class
 *   6. Submit button has min-h-[48px] class
 *   7. Success result card renders "Granted ✓" text
 *   8. Duplicate/already-had result card renders text containing "already had this stamp"
 *   9. Success card is visually distinct from duplicate card (different className)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import * as jestDomMatchers from "@testing-library/jest-dom/matchers";

expect.extend(jestDomMatchers);

afterEach(() => cleanup());

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

import ScanClient from "./ScanClient";

const defaultProps = {
  stampName: "Beach Stamp",
  stampImageUrl: "/beach.png",
};

describe("ScanClient — neo-brutalism redesign", () => {
  it("manual code input has min-h-[48px] class", () => {
    render(<ScanClient {...defaultProps} />);
    const input = screen.getByRole("textbox");
    expect(input.className).toContain("min-h-[48px]");
  });

  it("manual code input is full-width (w-full class)", () => {
    render(<ScanClient {...defaultProps} />);
    const input = screen.getByRole("textbox");
    expect(input.className).toContain("w-full");
  });

  it("manual code input has border-brutal class", () => {
    render(<ScanClient {...defaultProps} />);
    const input = screen.getByRole("textbox");
    expect(input.className).toContain("border-brutal");
  });

  it("submit button has border-brutal class", () => {
    render(<ScanClient {...defaultProps} />);
    const btn = screen.getByRole("button", { name: /grant stamp/i });
    expect(btn.className).toContain("border-brutal");
  });

  it("submit button has shadow-hard class", () => {
    render(<ScanClient {...defaultProps} />);
    const btn = screen.getByRole("button", { name: /grant stamp/i });
    expect(btn.className).toContain("shadow-hard");
  });

  it("submit button has min-h-[48px] class", () => {
    render(<ScanClient {...defaultProps} />);
    const btn = screen.getByRole("button", { name: /grant stamp/i });
    expect(btn.className).toContain("min-h-[48px]");
  });

  it("success result card renders 'Granted ✓' text", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        granted: true,
        alreadyHad: false,
        completionCaptured: false,
        card: { activeStamps: ["s1", "s2"], slots: [null, null, null, null, null], complete: false, bonusCount: 0 },
      }),
    });

    render(<ScanClient {...defaultProps} />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "ABC123" } });

    const btn = screen.getByRole("button", { name: /grant stamp/i });
    fireEvent.click(btn);

    await waitFor(() => {
      expect(screen.getByText("Granted ✓")).toBeInTheDocument();
    });
  });

  it("duplicate result card renders text about already having the stamp", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        granted: false,
        alreadyHad: true,
        completionCaptured: false,
        card: { activeStamps: ["s1"], slots: [null, null, null, null, null], complete: false, bonusCount: 0 },
      }),
    });

    render(<ScanClient {...defaultProps} />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "XYZ789" } });

    const btn = screen.getByRole("button", { name: /grant stamp/i });
    fireEvent.click(btn);

    await waitFor(() => {
      expect(screen.getByText(/already had this stamp/i)).toBeInTheDocument();
    });
  });

  it("success card has a different className from duplicate card", async () => {
    // First render: success
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        granted: true,
        alreadyHad: false,
        completionCaptured: false,
        card: { activeStamps: ["s1"], slots: [null, null, null, null, null], complete: false, bonusCount: 0 },
      }),
    });

    const { container: successContainer } = render(<ScanClient {...defaultProps} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "ABC123" } });
    fireEvent.click(screen.getByRole("button", { name: /grant stamp/i }));
    await waitFor(() => screen.getByText("Granted ✓"));

    const successCard = successContainer.querySelector("[data-testid='result-card']");
    const successClass = successCard?.className ?? "";

    cleanup();

    // Second render: duplicate
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        granted: false,
        alreadyHad: true,
        completionCaptured: false,
        card: { activeStamps: ["s1"], slots: [null, null, null, null, null], complete: false, bonusCount: 0 },
      }),
    });

    const { container: dupContainer } = render(<ScanClient {...defaultProps} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "XYZ789" } });
    fireEvent.click(screen.getByRole("button", { name: /grant stamp/i }));
    await waitFor(() => screen.getByText(/already had this stamp/i));

    const dupCard = dupContainer.querySelector("[data-testid='result-card']");
    const dupClass = dupCard?.className ?? "";

    expect(successClass).not.toEqual(dupClass);
  });
});
