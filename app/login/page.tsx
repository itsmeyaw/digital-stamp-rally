import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { resolveLanding } from "@/lib/auth/landing";
import { sanitizeReturnTo } from "@/lib/auth/return-to";
import LoginForm from "./login-form";

/**
 * Staff login (issue #4). Stampers / Redeemers / Admins sign in with username +
 * password. A visitor who already has a valid session is bounced to their
 * landing surface; otherwise the login form is shown.
 *
 * Accepts an optional `returnTo` query parameter (issue #25) so that staff
 * whose session expired can return to their target after signing in. The value
 * is sanitized server-side to prevent open-redirect phishing.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { returnTo } = await searchParams;
  const session = await getSession();
  if (session) {
    const landing = resolveLanding(session);
    redirect(sanitizeReturnTo(returnTo, landing));
  }

  // Sanitize before forwarding to the client component — empty string means
  // "no returnTo", so the form falls back to the role-based landing.
  const safeReturnTo = sanitizeReturnTo(returnTo, "");

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center gap-8 px-6 py-16 text-center"
      style={{ background: "var(--color-bg)" }}
    >
      <div className="flex flex-col items-center gap-2">
        <span className="rotate-2 border-[3px] border-black bg-[var(--color-accent)] px-3 py-1 text-xs font-bold uppercase tracking-[0.25em]">
          Staff only
        </span>
        <h1 className="font-display text-4xl uppercase text-[var(--color-text)]">
          Sign in
        </h1>
      </div>
      <LoginForm returnTo={safeReturnTo || undefined} />
      <Link
        href="/welcome"
        className="text-sm font-bold uppercase tracking-wide underline decoration-2 underline-offset-4"
      >
        ← Back to welcome
      </Link>
    </main>
  );
}
