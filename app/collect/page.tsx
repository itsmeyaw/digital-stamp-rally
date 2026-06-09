import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { resolveLanding } from "@/lib/auth/landing";
import { CollectButton } from "./collect-button";

/**
 * Intro screen shown after the visitor taps "Collect stamp" on welcome.
 * Explains the rally, then the button mints the User (POST /api/collect) and
 * lands them on their card.
 */
export default async function CollectPage() {
  const session = await getSession();
  if (session) redirect(resolveLanding(session));

  const steps = [
    "Visit booths around the event.",
    "Show your code to get it scanned.",
    "Fill all 5 slots to win your prize.",
  ];

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-16 text-center">
      <div className="flex max-w-md flex-col items-center gap-5">
        <h1 className="font-display text-4xl uppercase text-[var(--color-text)] sm:text-5xl">
          How it works
        </h1>

        <ol className="flex w-full flex-col gap-3 text-left">
          {steps.map((step, i) => (
            <li
              key={i}
              className="flex items-center gap-3 border-brutal bg-[var(--color-surface)] p-3 shadow-hard-sm"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center border-[3px] border-black bg-[var(--color-accent)] font-display text-lg">
                {i + 1}
              </span>
              <span className="font-medium leading-snug">{step}</span>
            </li>
          ))}
        </ol>

        <p className="text-sm font-medium text-[var(--color-text)]/70">
          Your card lives on this device — keep this browser to keep your
          progress.
        </p>
      </div>
      <CollectButton />
    </main>
  );
}
