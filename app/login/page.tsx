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
      <h1 className="text-3xl font-bold tracking-tight" style={{ color: "var(--color-text)" }}>
        Staff login
      </h1>
      <LoginForm />
      <Link href="/welcome" className="text-sm font-medium underline">
        Back to welcome
      </Link>
    </main>
  );
}
