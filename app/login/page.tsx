import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { resolveLanding } from "@/lib/auth/landing";
import LoginForm from "./login-form";

/**
 * Staff login (issue #4). Stampers / Redeemers / Admins sign in with username +
 * password. A visitor who already has a valid session is bounced to their
 * landing surface; otherwise the login form is shown.
 */
export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect(resolveLanding(session));

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
      <LoginForm />
      <Link
        href="/welcome"
        className="text-sm font-bold uppercase tracking-wide underline decoration-2 underline-offset-4"
      >
        ← Back to welcome
      </Link>
    </main>
  );
}
