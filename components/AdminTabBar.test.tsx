/**
 * Tests for AdminTabBar component.
 * Uses jsdom environment via vitest project config (*.test.tsx pattern).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// Mock next/navigation before importing the component
const mockPush = vi.fn();
let mockPathname = "/admin/stamps";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ push: mockPush }),
}));

// Import after mocks are set up
import { AdminTabBar } from "./AdminTabBar";

describe("AdminTabBar", () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockPathname = "/admin/stamps";
  });

  it("renders three tabs: Stamps, Staff, Grants", () => {
    render(<AdminTabBar />);
    expect(screen.getByRole("tab", { name: "Stamps" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Staff" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Grants" })).toBeInTheDocument();
  });

  it("marks the Stamps tab as active when pathname is /admin/stamps", () => {
    mockPathname = "/admin/stamps";
    render(<AdminTabBar />);
    const stampsTab = screen.getByRole("tab", { name: "Stamps" });
    expect(stampsTab).toHaveAttribute("data-state", "active");
  });

  it("marks the Staff tab as active when pathname is /admin/staff", () => {
    mockPathname = "/admin/staff";
    render(<AdminTabBar />);
    const staffTab = screen.getByRole("tab", { name: "Staff" });
    expect(staffTab).toHaveAttribute("data-state", "active");
  });

  it("marks the Grants tab as active when pathname is /admin/grants", () => {
    mockPathname = "/admin/grants";
    render(<AdminTabBar />);
    const grantsTab = screen.getByRole("tab", { name: "Grants" });
    expect(grantsTab).toHaveAttribute("data-state", "active");
  });

  it("calls router.push('/admin/staff') when Staff tab is clicked", () => {
    mockPathname = "/admin/stamps";
    render(<AdminTabBar />);
    const staffTab = screen.getByRole("tab", { name: "Staff" });
    // Radix Tabs uses onMouseDown (button=0, no ctrlKey) to activate
    fireEvent.mouseDown(staffTab, { button: 0, ctrlKey: false });
    expect(mockPush).toHaveBeenCalledWith("/admin/staff");
  });

  it("calls router.push('/admin/grants') when Grants tab is clicked", () => {
    mockPathname = "/admin/stamps";
    render(<AdminTabBar />);
    const grantsTab = screen.getByRole("tab", { name: "Grants" });
    fireEvent.mouseDown(grantsTab, { button: 0, ctrlKey: false });
    expect(mockPush).toHaveBeenCalledWith("/admin/grants");
  });

  it("calls router.push('/admin/stamps') when Stamps tab is clicked", () => {
    mockPathname = "/admin/grants";
    render(<AdminTabBar />);
    const stampsTab = screen.getByRole("tab", { name: "Stamps" });
    fireEvent.mouseDown(stampsTab, { button: 0, ctrlKey: false });
    expect(mockPush).toHaveBeenCalledWith("/admin/stamps");
  });

  it("has a tablist role for accessibility", () => {
    render(<AdminTabBar />);
    expect(screen.getByRole("tablist")).toBeInTheDocument();
  });

  it("inactive tabs do not have data-state='active'", () => {
    mockPathname = "/admin/stamps";
    render(<AdminTabBar />);
    const staffTab = screen.getByRole("tab", { name: "Staff" });
    const grantsTab = screen.getByRole("tab", { name: "Grants" });
    expect(staffTab).toHaveAttribute("data-state", "inactive");
    expect(grantsTab).toHaveAttribute("data-state", "inactive");
  });
});
