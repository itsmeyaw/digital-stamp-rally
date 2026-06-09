"use client";

import { useEffect, useState } from "react";
import { StampCard, EmptySlot } from "@/components/StampCard";
import type { SlotData } from "@/lib/user/card";

interface CardResult {
  activeStamps: string[];
  slots: (SlotData | null)[];
  complete: boolean;
  bonusCount: number;
}

interface CardPollerProps {
  initialCard: CardResult;
  pollIntervalMs?: number;
}

/**
 * Client component that polls /api/card every ~3–5s and keeps the displayed
 * card in sync, so a user standing at a booth sees their new stamp appear
 * without any manual action.
 */
export default function CardPoller({
  initialCard,
  pollIntervalMs = 4000,
}: CardPollerProps) {
  const [card, setCard] = useState<CardResult>(initialCard);

  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const res = await fetch("/api/card");
        if (res.ok) {
          const data: { card: CardResult } = await res.json();
          setCard(data.card);
        }
      } catch {
        // Network blip — ignore, will retry next interval
      }
    }, pollIntervalMs);
    return () => clearInterval(id);
  }, [pollIntervalMs]);

  const filled = card.activeStamps.length;
  const total = card.slots.length || 5;

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-6">
      {/* Progress tally — big and proud. */}
      <div className="flex w-full items-center justify-between border-brutal bg-[var(--color-surface)] px-4 py-3 shadow-hard">
        <span className="font-bold uppercase tracking-widest">Progress</span>
        <span className="font-display text-2xl">
          {filled}<span className="text-[var(--color-text)]/40">/{total}</span>
        </span>
      </div>

      <ul aria-label="stamp slots" className="grid w-full grid-cols-2 gap-4">
        {card.slots.map((slot, i) => (
          <li key={i} data-testid="slot" data-filled={slot !== null}>
            {slot !== null ? (
              <StampCard
                name={slot.name}
                imageUrl={slot.imageUrl}
                bgColor={slot.bgColor}
                textColor={slot.textColor}
              />
            ) : (
              <EmptySlot slotNumber={i + 1} />
            )}
          </li>
        ))}
      </ul>

      {card.bonusCount > 0 && (
        <p className="border-[3px] border-black bg-[var(--color-pink)] px-3 py-1 text-sm font-bold uppercase tracking-wide text-white">
          +{card.bonusCount} bonus stamp{card.bonusCount !== 1 ? "s" : ""}
        </p>
      )}

      {card.complete && (
        <div className="relative w-full overflow-hidden border-brutal bg-[var(--color-lime)] shadow-hard-lg">
          {/* Hazard stripes top & bottom frame the shout. */}
          <div className="brutal-stripes h-3 w-full opacity-90" aria-hidden />
          <p className="py-5 text-center font-display text-4xl uppercase tracking-[0.15em] text-black">
            COMPLETE!
          </p>
          <div className="brutal-stripes h-3 w-full opacity-90" aria-hidden />
        </div>
      )}
    </div>
  );
}
