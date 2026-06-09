/**
 * CardPoller component tests.
 *
 * Behaviors:
 *   1. Filled slot renders StampCard (data-testid="stamp-card") with correct bgColor
 *   2. Empty slot renders EmptySlot (data-testid="empty-slot") with slot number
 *   3. Complete banner is present when card.complete === true
 *   4. Complete banner is absent when card.complete === false
 *   5. data-testid="slot" wrapper is preserved on each slot element
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import CardPoller from "./CardPoller";
import type { SlotData } from "@/lib/user/card";

function makeCard(overrides: Partial<{
  activeStamps: string[];
  slots: (SlotData | null)[];
  complete: boolean;
  bonusCount: number;
}>) {
  return {
    activeStamps: [],
    slots: [null, null, null, null, null],
    complete: false,
    bonusCount: 0,
    ...overrides,
  };
}

const filledSlot: SlotData = {
  name: "Beach",
  imageUrl: "/beach.png",
  bgColor: "#FF0000",
  textColor: "#FFFFFF",
};

describe("CardPoller", () => {
  it("renders StampCard for a filled slot with correct bgColor", () => {
    const card = makeCard({ slots: [filledSlot, null, null, null, null] });
    render(<CardPoller initialCard={card} />);
    const stampCards = screen.getAllByTestId("stamp-card");
    expect(stampCards).toHaveLength(1);
    expect(stampCards[0]).toHaveStyle({ backgroundColor: "#FF0000" });
  });

  it("renders EmptySlot for unfilled slots with slot numbers", () => {
    const card = makeCard({ slots: [null, null, null, null, null] });
    render(<CardPoller initialCard={card} />);
    const emptySlots = screen.getAllByTestId("empty-slot");
    expect(emptySlots).toHaveLength(5);
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("renders correct mix of StampCard and EmptySlot", () => {
    const card = makeCard({
      slots: [filledSlot, null, filledSlot, null, null],
      activeStamps: ["s1", "s2"],
    });
    render(<CardPoller initialCard={card} />);
    expect(screen.getAllByTestId("stamp-card")).toHaveLength(2);
    expect(screen.getAllByTestId("empty-slot")).toHaveLength(3);
  });

  it("shows COMPLETE! banner when card.complete === true", () => {
    const card = makeCard({ complete: true });
    render(<CardPoller initialCard={card} />);
    expect(screen.getByText("COMPLETE!")).toBeInTheDocument();
  });

  it("does not show COMPLETE! banner when card.complete === false", () => {
    const card = makeCard({ complete: false });
    render(<CardPoller initialCard={card} />);
    expect(screen.queryByText("COMPLETE!")).not.toBeInTheDocument();
  });

  it("preserves data-testid='slot' wrapper on each slot element", () => {
    const card = makeCard({ slots: [filledSlot, null, null, null, null] });
    render(<CardPoller initialCard={card} />);
    const slots = screen.getAllByTestId("slot");
    expect(slots).toHaveLength(5);
  });

  it("renders 2-column grid (grid-cols-2)", () => {
    const card = makeCard();
    const { container } = render(<CardPoller initialCard={card} />);
    const grid = container.querySelector(".grid-cols-2");
    expect(grid).not.toBeNull();
  });
});
