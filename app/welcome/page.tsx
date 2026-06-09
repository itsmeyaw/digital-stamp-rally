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
    <main
      className="flex flex-1 flex-col items-center justify-center gap-10 px-6 py-16 text-center"
      style={{ background: "var(--color-bg)" }}
    >
      <h1
        className="max-w-md text-4xl font-bold tracking-tight"
        style={{ color: "var(--color-text)" }}
      >
        Welcome to {eventName()} Stamp Rally
      </h1>
      <div className="flex w-full max-w-xs flex-col gap-4">
        <Link
          href="/collect"
          className="flex items-center justify-center px-5 font-bold text-white border-brutal shadow-hard transition-transform active:translate-y-0.5"
          style={{
            background: "var(--color-primary)",
            minHeight: "48px",
          }}
        >
          Collect stamp
        </Link>
        <Link
          href="/login"
          className="flex items-center justify-center px-5 font-bold border-brutal shadow-hard transition-transform active:translate-y-0.5"
          style={{
            background: "var(--color-bg)",
            color: "var(--color-text)",
            minHeight: "48px",
          }}
        >
          Login
        </Link>
      </div>
    </main>
  );
}
