/**
 * Shared neo-brutalist class strings for admin form controls, so every form
 * (stamps / stamper / redeemer / grants / staff-row) reads the same way:
 * fat black border, hard offset shadow, square corners, uppercase signage type.
 */

export const fieldLabel =
  "flex flex-col gap-1.5 text-left text-xs font-bold uppercase tracking-widest";

export const fieldInput =
  "h-12 border-brutal bg-white px-3 font-medium shadow-hard-sm focus:outline-none focus:-translate-y-0.5 focus:shadow-hard transition-all";

export const fieldSelect = fieldInput;

/** Primary action — electric blue slab. */
export const btnPrimary =
  "btn-press flex h-12 items-center justify-center border-brutal bg-[var(--color-primary)] px-5 font-display text-base uppercase tracking-wide text-white shadow-hard disabled:opacity-50";

/** Secondary / destructive-leaning action — white slab. */
export const btnSecondary =
  "btn-press flex h-12 items-center justify-center border-brutal bg-white px-5 font-display text-base uppercase tracking-wide text-black shadow-hard disabled:opacity-50";

/** Inline error banner. */
export const errorBanner =
  "border-[3px] border-black bg-[var(--color-danger)] px-3 py-2 text-sm font-bold text-white";
