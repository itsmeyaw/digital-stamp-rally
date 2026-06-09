import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { resolveLanding } from "@/lib/auth/landing";
import { eventName } from "@/lib/env";

/**
 * Welcome screen — what a first-time visitor sees. Shows the event name from
 * deploy config (EVENT_NAME) and the two entry actions. A returning user with a
 * valid session is bounced straight to their landing surface.
 */
export default async function WelcomePage() {
  const session = await getSession();
  if (session) redirect(resolveLanding(session));

  return (
    <main className="relative flex flex-1 flex-col items-center justify-center gap-10 overflow-hidden px-6 py-16 text-center">
      {/* Decorative tilted stickers — pure ornament, hidden from AT. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -left-6 top-16 -rotate-12 select-none border-4 border-black bg-[var(--color-pink)] px-4 py-2 font-display text-lg uppercase shadow-[6px_6px_0px_#0A0A0A]"
      >
        5 stamps
      </span>
      <span
        aria-hidden
        className="pointer-events-none absolute -right-4 bottom-24 rotate-12 select-none border-4 border-black bg-[var(--color-lime)] px-4 py-2 font-display text-lg uppercase shadow-[6px_6px_0px_#0A0A0A]"
      >
        1 prize
      </span>

      <div className="relative flex max-w-md flex-col items-center gap-4">
        <span className="rotate-[-2deg] border-[3px] border-black bg-[var(--color-accent)] px-3 py-1 text-xs font-bold uppercase tracking-[0.25em]">
          Welcome to
        </span>
        <h1 className="font-display text-5xl uppercase text-[var(--color-text)] sm:text-6xl">
          {eventName()} <span className="text-[var(--color-primary)]">Stamp Rally</span>
        </h1>
      </div>

      <div className="flex w-full max-w-xs flex-col gap-4">
        <Link
          href="/collect"
          className="btn-press flex items-center justify-center border-brutal bg-[var(--color-primary)] px-5 font-display text-lg uppercase tracking-wide text-white shadow-hard"
          style={{ minHeight: "56px" }}
        >
          Collect stamp →
        </Link>
        <Link
          href="/login"
          className="btn-press flex items-center justify-center border-brutal bg-[var(--color-surface)] px-5 font-bold uppercase tracking-wide text-[var(--color-text)] shadow-hard"
          style={{ minHeight: "56px" }}
        >
          Staff login
        </Link>
      </div>
    </main>
  );
}
