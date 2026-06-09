import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import StampForm from "./stamps-form";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => "blob:mock-url");
global.URL.revokeObjectURL = vi.fn();

describe("StampForm color pickers and preview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders bgColor color picker with default value #0057FF", () => {
    render(<StampForm />);
    const bgInput = screen.getByLabelText(/background color/i) as HTMLInputElement;
    expect(bgInput).toBeTruthy();
    expect(bgInput.type).toBe("color");
    expect(bgInput.value).toBe("#0057ff");
  });

  it("renders textColor color picker with default value #FFFFFF", () => {
    render(<StampForm />);
    const textInput = screen.getByLabelText(/text color/i) as HTMLInputElement;
    expect(textInput).toBeTruthy();
    expect(textInput.type).toBe("color");
    expect(textInput.value).toBe("#ffffff");
  });

  it("renders the StampCard preview", () => {
    render(<StampForm />);
    const card = screen.getByTestId("stamp-card");
    expect(card).toBeTruthy();
  });

  it("changing bgColor updates the StampCard background style", () => {
    render(<StampForm />);
    const bgInput = screen.getByLabelText(/background color/i) as HTMLInputElement;
    fireEvent.change(bgInput, { target: { value: "#ff0000" } });
    const card = screen.getByTestId("stamp-card");
    expect(card).toHaveStyle({ backgroundColor: "#ff0000" });
  });

  it("changing textColor updates the StampCard text color", () => {
    render(<StampForm />);
    const textInput = screen.getByLabelText(/text color/i) as HTMLInputElement;
    fireEvent.change(textInput, { target: { value: "#123456" } });
    // Query the name span inside the stamp card directly
    const card = screen.getByTestId("stamp-card");
    const nameSpan = card.querySelector("span");
    expect(nameSpan).toHaveStyle({ color: "#123456" });
  });

  it("typing a name updates the preview name text", () => {
    render(<StampForm />);
    const nameInput = screen.getByLabelText(/^name$/i);
    fireEvent.change(nameInput, { target: { value: "My Stamp" } });
    expect(screen.getByTestId("stamp-card")).toHaveTextContent("My Stamp");
  });

  it("submitting with custom colors calls fetch with bgColor and textColor", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
    global.fetch = mockFetch;

    render(<StampForm />);

    // Fill name
    const nameInput = screen.getByLabelText(/^name$/i);
    fireEvent.change(nameInput, { target: { value: "Test Stamp" } });

    // Set colors
    const bgInput = screen.getByLabelText(/background color/i);
    fireEvent.change(bgInput, { target: { value: "#aabbcc" } });

    const textInput = screen.getByLabelText(/text color/i);
    fireEvent.change(textInput, { target: { value: "#112233" } });

    // Pick a file
    const file = new File(["img"], "stamp.png", { type: "image/png" });
    const fileInput = screen.getByLabelText(/square image/i);
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Submit
    const form = screen.getByRole("form");
    fireEvent.submit(form);

    await waitFor(() => expect(mockFetch).toHaveBeenCalledOnce());

    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = options.body as FormData;
    expect(body.get("bgColor")).toBe("#aabbcc");
    expect(body.get("textColor")).toBe("#112233");
  });

  it("submitting without changing colors sends default color values", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
    global.fetch = mockFetch;

    render(<StampForm />);

    // Fill name
    const nameInput = screen.getByLabelText(/^name$/i);
    fireEvent.change(nameInput, { target: { value: "Default Colors Stamp" } });

    // Pick a file (required)
    const file = new File(["img"], "stamp.png", { type: "image/png" });
    const fileInput = screen.getByLabelText(/square image/i);
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Submit without changing colors
    const form = screen.getByRole("form");
    fireEvent.submit(form);

    await waitFor(() => expect(mockFetch).toHaveBeenCalledOnce());

    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = options.body as FormData;
    expect(body.get("bgColor")).toBe("#0057ff");
    expect(body.get("textColor")).toBe("#ffffff");
  });
});
