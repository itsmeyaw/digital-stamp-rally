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
    <main className="flex flex-1 flex-col items-center justify-center gap-8 bg-zinc-50 px-6 py-16 text-center dark:bg-black">
      <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
        Staff login
      </h1>
      <LoginForm />
      <Link href="/welcome" className="text-sm font-medium underline">
        Back to welcome
      </Link>
    </main>
  );
}
