interface StampCardProps {
  name: string;
  imageUrl: string;
  bgColor: string;
  textColor: string;
}

interface EmptySlotProps {
  slotNumber: number;
}

/**
 * A filled stamp slot: hard-bordered colour block, a white "punched" disc
 * holding the icon, and the stamp name in the admin-chosen text colour.
 *
 * Background and text colours are caller-controlled (set per-stamp by an admin),
 * so they stay inline; the brutalist chrome (border, hard shadow, square corners)
 * is fixed. Note the name is the FIRST <span> in the card — the stamp-form test
 * reads `card.querySelector("span")` to assert the text colour.
 */
export function StampCard({ name, imageUrl, bgColor, textColor }: StampCardProps) {
  return (
    <div
      data-testid="stamp-card"
      className="border-brutal shadow-hard flex flex-col items-center gap-3 p-4"
      style={{ backgroundColor: bgColor }}
    >
      <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-[3px] border-[#0A0A0A] bg-white">
        <img src={imageUrl} alt={name} className="h-11 w-11 object-contain" />
      </div>
      <span
        className="text-center text-sm font-bold uppercase leading-tight tracking-tight"
        style={{ color: textColor }}
      >
        {name}
      </span>
    </div>
  );
}

/**
 * An unfilled slot: dashed brutalist outline with a big ghosted slot number,
 * matching the filled card's footprint so the grid stays even.
 */
export function EmptySlot({ slotNumber }: EmptySlotProps) {
  return (
    <div
      data-testid="empty-slot"
      className="flex aspect-square w-full items-center justify-center border-4 border-dashed border-[#0A0A0A]/35 bg-white/40 text-4xl font-display text-[#0A0A0A]/25"
    >
      {slotNumber}
    </div>
  );
}
