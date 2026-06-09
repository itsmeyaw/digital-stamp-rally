"use client";

import { useEffect, useState } from "react";

interface CardResult {
  activeStamps: string[];
  slots: (string | null)[];
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
      {card.complete && (
        <div className="rounded-full bg-green-100 px-4 py-2 text-sm font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
          Complete! 🎉
        </div>
      )}

      <ul aria-label="stamp slots" className="grid grid-cols-5 gap-3">
        {card.slots.map((slot, i) => (
          <li
            key={i}
            data-testid="slot"
            data-filled={slot !== null}
            className={`flex aspect-square w-14 items-center justify-center rounded-lg border-2 ${
              slot !== null
                ? "border-green-400 bg-green-50 text-green-700 dark:border-green-600 dark:bg-green-900/20 dark:text-green-400"
                : "border-dashed border-zinc-300 text-zinc-300 dark:border-zinc-700 dark:text-zinc-700"
            }`}
          >
            {slot !== null ? "✓" : i + 1}
          </li>
        ))}
      </ul>

      {card.bonusCount > 0 && (
        <p className="text-sm text-zinc-500">
          +{card.bonusCount} bonus stamp{card.bonusCount !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
