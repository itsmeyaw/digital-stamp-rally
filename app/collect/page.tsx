import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { resolveLanding } from "@/lib/auth/landing";
import { eventName } from "@/lib/env";
import { CollectButton } from "./collect-button";

/**
 * Intro screen shown after the visitor taps "Collect stamp" on welcome.
 * Explains the rally, then the button mints the User (POST /api/collect) and
 * lands them on their card.
 */
export default async function CollectPage() {
  const session = await getSession();
  if (session) redirect(resolveLanding(session));

  return (
    <main
      className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-16 text-center"
      style={{ background: "var(--color-bg)" }}
    >
      <div className="flex max-w-md flex-col gap-4">
        <h1
          className="text-3xl font-bold tracking-tight"
          style={{ color: "var(--color-text)" }}
        >
          How {eventName()} Stamp Rally works
        </h1>
        <p style={{ color: "#444" }}>
          Visit booths around the event and have your code scanned to collect
          stamps. Fill all 5 slots on your card to complete the rally and claim
          your prize. Your card lives on this device — keep this browser to keep
          your progress.
        </p>
      </div>
      <CollectButton />
    </main>
  );
}
