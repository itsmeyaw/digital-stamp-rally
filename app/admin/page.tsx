import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/authorize";

/**
 * Administrator dashboard landing surface (ADR-0001: admin -> /admin). Minimal
 * authenticated shell — stamp/stamper/redeemer management arrives in issues
 * #5, #6, #8. Any visitor without an Admin session is sent back to welcome.
 */
export default async function AdminPage() {
  const session = await getSession();
  if (!requireRole(session, "admin")) redirect("/welcome");

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 bg-zinc-50 px-6 py-16 text-center dark:bg-black">
      <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
        Admin dashboard
      </h1>
      <p className="max-w-sm text-zinc-600 dark:text-zinc-400">
        Stamp and staff management arrives soon.
      </p>
    </main>
  );
}
