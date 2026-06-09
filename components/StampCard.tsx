interface StampCardProps {
  name: string;
  imageUrl: string;
  bgColor: string;
  textColor: string;
}

interface EmptySlotProps {
  slotNumber: number;
}

export function StampCard({ name, imageUrl, bgColor, textColor }: StampCardProps) {
  return (
    <div
      data-testid="stamp-card"
      className="border-brutal shadow-hard flex flex-col items-center gap-2 p-3 rounded"
      style={{ backgroundColor: bgColor }}
    >
      <div className="flex items-center justify-center rounded-full bg-white w-14 h-14 overflow-hidden">
        <img src={imageUrl} alt={name} className="w-10 h-10 object-contain" />
      </div>
      <span
        className="text-sm font-semibold text-center leading-tight"
        style={{ color: textColor }}
      >
        {name}
      </span>
    </div>
  );
}

export function EmptySlot({ slotNumber }: EmptySlotProps) {
  return (
    <div
      data-testid="empty-slot"
      className="border-dashed border-2 border-black flex items-center justify-center aspect-square w-14 rounded text-zinc-400 font-semibold"
    >
      {slotNumber}
    </div>
  );
}
