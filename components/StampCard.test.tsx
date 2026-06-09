import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StampCard, EmptySlot } from "./StampCard";

describe("StampCard", () => {
  it("applies bgColor as background style", () => {
    render(
      <StampCard
        name="Beach"
        imageUrl="/beach.png"
        bgColor="#FF0000"
        textColor="#FFFFFF"
      />
    );
    const card = screen.getByTestId("stamp-card");
    expect(card).toHaveStyle({ backgroundColor: "#FF0000" });
  });

  it("displays the stamp name", () => {
    render(
      <StampCard
        name="Mountain"
        imageUrl="/mountain.png"
        bgColor="#00FF00"
        textColor="#000000"
      />
    );
    expect(screen.getByText("Mountain")).toBeInTheDocument();
  });

  it("renders an image with the correct src", () => {
    render(
      <StampCard
        name="Forest"
        imageUrl="/forest.png"
        bgColor="#0000FF"
        textColor="#FFFFFF"
      />
    );
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "/forest.png");
  });

  it("applies textColor to the name label", () => {
    render(
      <StampCard
        name="Ocean"
        imageUrl="/ocean.png"
        bgColor="#123456"
        textColor="#ABCDEF"
      />
    );
    const label = screen.getByText("Ocean");
    expect(label).toHaveStyle({ color: "#ABCDEF" });
  });
});

describe("EmptySlot", () => {
  it("renders the slot number", () => {
    render(<EmptySlot slotNumber={1} />);
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("renders a different slot number", () => {
    render(<EmptySlot slotNumber={7} />);
    expect(screen.getByText("7")).toBeInTheDocument();
  });

  it("has data-testid empty-slot", () => {
    render(<EmptySlot slotNumber={3} />);
    expect(screen.getByTestId("empty-slot")).toBeInTheDocument();
  });

  it("has dashed border styling class", () => {
    render(<EmptySlot slotNumber={2} />);
    const el = screen.getByTestId("empty-slot");
    expect(el.className).toMatch(/border-dashed/);
  });
});
