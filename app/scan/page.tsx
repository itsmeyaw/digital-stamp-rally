import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/authorize";

/**
 * Stamper landing surface (ADR-0001: stamper -> /scan). Minimal authenticated
 * shell — the QR-scan + grant flow arrives in issue #7. Any visitor without a
 * Stamper session is sent back to welcome.
 */
export default async function ScanPage() {
  const session = await getSession();
  if (!requireRole(session, "stamper")) redirect("/welcome");

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 bg-zinc-50 px-6 py-16 text-center dark:bg-black">
      <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
        Scan
      </h1>
      <p className="max-w-sm text-zinc-600 dark:text-zinc-400">
        The stamp-granting scan flow arrives soon.
      </p>
    </main>
  );
}
