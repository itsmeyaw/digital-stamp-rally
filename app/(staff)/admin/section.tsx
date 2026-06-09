import type { ReactNode } from "react";

/**
 * Page-level heading for an admin sub-page: a big display title plus a short
 * description, in the carnival-brutalist key.
 */
export function PageHeading({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-2">
      <h1 className="font-display text-4xl uppercase text-black">{title}</h1>
      <p className="max-w-prose text-sm font-medium text-black/60">{children}</p>
    </header>
  );
}

/**
 * A boxed section title — a small black tab that sits on top of its content
 * so each admin section reads as its own labelled card.
 */
export function SectionTitle({
  id,
  children,
}: {
  id?: string;
  children: ReactNode;
}) {
  return (
    <h2
      id={id}
      className="self-start border-brutal bg-black px-4 py-1.5 font-display text-lg uppercase text-white shadow-hard-sm"
    >
      {children}
    </h2>
  );
}

/** Quiet sub-heading used for "All X (n)" list captions. */
export function ListCaption({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-xs font-bold uppercase tracking-widest text-black/50">
      {children}
    </h3>
  );
}
