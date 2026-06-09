import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NavigationShell } from "./NavigationShell";

describe("NavigationShell", () => {
  it("renders the app name 'Stamp Rally'", () => {
    render(
      <NavigationShell role="stamper">
        <div>content</div>
      </NavigationShell>,
    );
    expect(screen.getByText("Stamp Rally")).toBeInTheDocument();
  });

  it("has data-testid='nav-shell'", () => {
    render(
      <NavigationShell role="admin">
        <div>content</div>
      </NavigationShell>,
    );
    expect(screen.getByTestId("nav-shell")).toBeInTheDocument();
  });

  it("renders 'Stamper' role badge for role='stamper'", () => {
    render(
      <NavigationShell role="stamper">
        <div>content</div>
      </NavigationShell>,
    );
    expect(screen.getByTestId("role-badge")).toHaveTextContent("Stamper");
  });

  it("renders 'Redeemer' role badge for role='redeemer'", () => {
    render(
      <NavigationShell role="redeemer">
        <div>content</div>
      </NavigationShell>,
    );
    expect(screen.getByTestId("role-badge")).toHaveTextContent("Redeemer");
  });

  it("renders 'Admin' role badge for role='admin'", () => {
    render(
      <NavigationShell role="admin">
        <div>content</div>
      </NavigationShell>,
    );
    expect(screen.getByTestId("role-badge")).toHaveTextContent("Admin");
  });

  it("renders children below the top bar", () => {
    render(
      <NavigationShell role="admin">
        <div data-testid="page-content">hello</div>
      </NavigationShell>,
    );
    expect(screen.getByTestId("page-content")).toBeInTheDocument();
  });

  it("top bar has a black background", () => {
    render(
      <NavigationShell role="stamper">
        <div>content</div>
      </NavigationShell>,
    );
    const topBar = screen.getByTestId("nav-top-bar");
    expect(topBar).toHaveStyle({ backgroundColor: "#000000" });
  });

  it("top bar has white text", () => {
    render(
      <NavigationShell role="stamper">
        <div>content</div>
      </NavigationShell>,
    );
    const topBar = screen.getByTestId("nav-top-bar");
    expect(topBar).toHaveStyle({ color: "#ffffff" });
  });
});
