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

  return (
    <div className="flex flex-col items-center gap-6">
      <ul aria-label="stamp slots" className="grid grid-cols-2 gap-3">
        {card.slots.map((slot, i) => (
          <li
            key={i}
            data-testid="slot"
            data-filled={slot !== null}
          >
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
        <p className="text-sm text-zinc-500">
          +{card.bonusCount} bonus stamp{card.bonusCount !== 1 ? "s" : ""}
        </p>
      )}

      {card.complete && (
        <div className="border-brutal shadow-hard w-full bg-yellow-300 py-3 text-center text-2xl font-black tracking-widest text-black">
          COMPLETE!
        </div>
      )}
    </div>
  );
}
