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
    <main className="flex flex-1 flex-col items-center justify-center gap-10 bg-zinc-50 px-6 py-16 text-center dark:bg-black">
      <h1 className="max-w-md text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
        Welcome to {eventName()} Stamp Rally
      </h1>
      <div className="flex w-full max-w-xs flex-col gap-4">
        <Link
          href="/collect"
          className="flex h-12 items-center justify-center rounded-full bg-black px-5 font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
        >
          Collect stamp
        </Link>
        <Link
          href="/login"
          className="flex h-12 items-center justify-center rounded-full border border-black/15 px-5 font-medium transition-colors hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
        >
          Login
        </Link>
      </div>
    </main>
  );
}
