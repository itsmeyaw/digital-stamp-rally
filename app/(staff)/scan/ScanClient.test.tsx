/**
 * ScanClient tests (issue #26 — prefill + remove in-browser camera).
 *
 * Behaviours tested:
 *   1. Prefill rendering: when initialCode="ABC123" prop given, code input shows "ABC123"
 *      and Grant button is enabled.
 *   2. Tap-to-grant: click Grant stamp → fetch called with correct body → result card shown.
 *   3. Manual entry: no initialCode prop → input empty, button disabled until 6 chars typed.
 *   4. Not-found error: fetch returns 404 → friendly "User not found" message shown.
 *   5. No camera elements: "Start camera" button and <video> element are absent.
 *   6. No session tally: running tally paragraph is absent.
 *   7. Result card shows scan-next hint after grant.
 *   (Legacy) Existing style-class tests preserved.
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function successResponse(overrides = {}) {
  return {
    ok: true,
    json: async () => ({
      granted: true,
      alreadyHad: false,
      completionCaptured: false,
      card: {
        activeStamps: ["s1", "s2"],
        slots: [null, null, null, null, null],
        complete: false,
        bonusCount: 0,
      },
      ...overrides,
    }),
  };
}

function alreadyHadResponse() {
  return {
    ok: true,
    json: async () => ({
      granted: false,
      alreadyHad: true,
      completionCaptured: false,
      card: {
        activeStamps: ["s1"],
        slots: [null, null, null, null, null],
        complete: false,
        bonusCount: 0,
      },
    }),
  };
}

function notFoundResponse() {
  return {
    ok: false,
    status: 404,
    json: async () => ({ error: "User not found" }),
  };
}

// ---------------------------------------------------------------------------
// Behaviour: Prefill rendering
// ---------------------------------------------------------------------------
describe("ScanClient — prefill rendering", () => {
  it("when initialCode is given, code input shows that value", () => {
    render(<ScanClient {...defaultProps} initialCode="ABC123" />);
    const input = screen.getByRole("textbox");
    expect(input).toHaveValue("ABC123");
  });

  it("when initialCode is given, Grant button is enabled immediately", () => {
    render(<ScanClient {...defaultProps} initialCode="ABC123" />);
    const btn = screen.getByRole("button", { name: /grant stamp/i });
    expect(btn).not.toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// Behaviour: Tap-to-grant (with prefill)
// ---------------------------------------------------------------------------
describe("ScanClient — tap-to-grant with prefill", () => {
  it("clicking Grant stamp posts the prefilled code to /api/grant", async () => {
    mockFetch.mockResolvedValueOnce(successResponse());

    render(<ScanClient {...defaultProps} initialCode="ABC123" />);
    fireEvent.click(screen.getByRole("button", { name: /grant stamp/i }));

    await waitFor(() => expect(mockFetch).toHaveBeenCalledOnce());

    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/grant");
    expect(JSON.parse(opts.body as string)).toEqual({ userCode: "ABC123" });
  });

  it("result card is shown after a successful grant via prefill", async () => {
    mockFetch.mockResolvedValueOnce(successResponse());

    render(<ScanClient {...defaultProps} initialCode="XYZ789" />);
    fireEvent.click(screen.getByRole("button", { name: /grant stamp/i }));

    await waitFor(() => {
      expect(screen.getByTestId("result-card")).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Behaviour: Manual code entry (no initialCode)
// ---------------------------------------------------------------------------
describe("ScanClient — manual entry (no initialCode)", () => {
  it("code input starts empty when no initialCode prop", () => {
    render(<ScanClient {...defaultProps} />);
    const input = screen.getByRole("textbox");
    expect(input).toHaveValue("");
  });

  it("Grant button is disabled when input has fewer than 6 chars", () => {
    render(<ScanClient {...defaultProps} />);
    const btn = screen.getByRole("button", { name: /grant stamp/i });
    expect(btn).toBeDisabled();
  });

  it("Grant button becomes enabled after typing 6 characters", () => {
    render(<ScanClient {...defaultProps} />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "ABC123" } });
    const btn = screen.getByRole("button", { name: /grant stamp/i });
    expect(btn).not.toBeDisabled();
  });

  it("clicking Grant stamp posts the manually-typed code to /api/grant", async () => {
    mockFetch.mockResolvedValueOnce(successResponse());

    render(<ScanClient {...defaultProps} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "DEF456" } });
    fireEvent.click(screen.getByRole("button", { name: /grant stamp/i }));

    await waitFor(() => expect(mockFetch).toHaveBeenCalledOnce());
    const [, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(opts.body as string)).toEqual({ userCode: "DEF456" });
  });
});

// ---------------------------------------------------------------------------
// Behaviour: Not-found error
// ---------------------------------------------------------------------------
describe("ScanClient — not-found error", () => {
  it("shows friendly message when fetch returns 404", async () => {
    mockFetch.mockResolvedValueOnce(notFoundResponse());

    render(<ScanClient {...defaultProps} initialCode="BAD999" />);
    fireEvent.click(screen.getByRole("button", { name: /grant stamp/i }));

    await waitFor(() => {
      expect(screen.getByText(/user not found/i)).toBeInTheDocument();
    });
  });

  it("does NOT render a result card on 404", async () => {
    mockFetch.mockResolvedValueOnce(notFoundResponse());

    render(<ScanClient {...defaultProps} initialCode="BAD999" />);
    fireEvent.click(screen.getByRole("button", { name: /grant stamp/i }));

    await waitFor(() => screen.getByText(/user not found/i));
    expect(screen.queryByTestId("result-card")).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Behaviour: No camera, no session tally
// ---------------------------------------------------------------------------
describe("ScanClient — removed elements", () => {
  it("does not render a 'Start camera' button", () => {
    render(<ScanClient {...defaultProps} />);
    expect(screen.queryByRole("button", { name: /start camera/i })).not.toBeInTheDocument();
  });

  it("does not render a <video> element", () => {
    const { container } = render(<ScanClient {...defaultProps} />);
    expect(container.querySelector("video")).toBeNull();
  });

  it("does not render the running session tally", () => {
    render(<ScanClient {...defaultProps} />);
    expect(screen.queryByText(/granted.*stamp.*this session/i)).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Behaviour: Scan-next hint after grant
// ---------------------------------------------------------------------------
describe("ScanClient — scan-next hint", () => {
  it("shows a scan-next hint after a successful grant", async () => {
    mockFetch.mockResolvedValueOnce(successResponse());

    render(<ScanClient {...defaultProps} initialCode="ABC123" />);
    fireEvent.click(screen.getByRole("button", { name: /grant stamp/i }));

    await waitFor(() => {
      const hint = screen.queryByText(/ready for the next visitor/i) ??
        screen.queryByText(/scan next/i) ??
        screen.queryByRole("button", { name: /scan next/i });
      expect(hint).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Behaviour: result card success vs. duplicate (legacy)
// ---------------------------------------------------------------------------
describe("ScanClient — result card variants", () => {
  it("success result card renders 'Granted ✓' text", async () => {
    mockFetch.mockResolvedValueOnce(successResponse());

    render(<ScanClient {...defaultProps} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "ABC123" } });
    fireEvent.click(screen.getByRole("button", { name: /grant stamp/i }));

    await waitFor(() => {
      expect(screen.getByText("Granted ✓")).toBeInTheDocument();
    });
  });

  it("duplicate result card renders text about already having the stamp", async () => {
    mockFetch.mockResolvedValueOnce(alreadyHadResponse());

    render(<ScanClient {...defaultProps} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "XYZ789" } });
    fireEvent.click(screen.getByRole("button", { name: /grant stamp/i }));

    await waitFor(() => {
      expect(screen.getByText(/already had this stamp/i)).toBeInTheDocument();
    });
  });

  it("success card has a different className from duplicate card", async () => {
    // First render: success
    mockFetch.mockResolvedValueOnce(successResponse());

    const { container: successContainer } = render(<ScanClient {...defaultProps} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "ABC123" } });
    fireEvent.click(screen.getByRole("button", { name: /grant stamp/i }));
    await waitFor(() => screen.getByText("Granted ✓"));

    const successCard = successContainer.querySelector("[data-testid='result-card']");
    const successClass = successCard?.className ?? "";

    cleanup();

    // Second render: duplicate
    mockFetch.mockResolvedValueOnce(alreadyHadResponse());

    const { container: dupContainer } = render(<ScanClient {...defaultProps} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "XYZ789" } });
    fireEvent.click(screen.getByRole("button", { name: /grant stamp/i }));
    await waitFor(() => screen.getByText(/already had this stamp/i));

    const dupCard = dupContainer.querySelector("[data-testid='result-card']");
    const dupClass = dupCard?.className ?? "";

    expect(successClass).not.toEqual(dupClass);
  });
});

// ---------------------------------------------------------------------------
// Style-class assertions (legacy — preserved from issue #21)
// ---------------------------------------------------------------------------
describe("ScanClient — neo-brutalism style classes", () => {
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
});
