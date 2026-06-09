import Link from "next/link";

/**
 * Staff login. Username + password auth for Stampers / Redeemers / Admins
 * arrives in issue #4; this is the placeholder destination so the welcome
 * "Login" action has somewhere to go.
 */
export default function LoginPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-zinc-50 px-6 py-16 text-center dark:bg-black">
      <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
        Staff login
      </h1>
      <p className="max-w-sm text-zinc-600 dark:text-zinc-400">
        Sign-in for booth staff and organisers is coming soon.
      </p>
      <Link href="/welcome" className="font-medium underline">
        Back to welcome
      </Link>
    </main>
  );
}
