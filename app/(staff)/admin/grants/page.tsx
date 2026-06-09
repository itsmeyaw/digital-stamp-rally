import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/authorize";
import { getDb } from "@/lib/db/client";
import { listStamps } from "@/lib/stamp/stamp";
import GrantsForm from "../grants-form";

/**
 * Admin Grants sub-page (/admin/grants).
 *
 * Shows the grant/revoke form for manually assigning or removing stamps
 * from users by their 6-character code.
 * Requires an active admin session; redirects to /welcome otherwise.
 */
export default async function AdminGrantsPage() {
  const session = await getSession();
  if (!requireRole(session, "admin")) redirect("/welcome");

  const db = getDb();
  const stamps = await listStamps(db);
  const stampOptions = stamps.map((s) => ({ id: s.id, name: s.name }));

  return (
    <main className="flex flex-1 flex-col gap-12 bg-zinc-50 px-6 py-12 dark:bg-black">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Users / grants
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Grant a stamp to fix a missed scan, or revoke one to correct a
          mis-scan. Revoking a middle stamp compacts remaining stamps left
          automatically.
        </p>
      </header>

      {/* ── Users / grants ─────────────────────────────────────── */}
      <section aria-labelledby="section-grants" className="flex flex-col gap-4">
        <h2
          id="section-grants"
          className="text-xl font-semibold text-black dark:text-zinc-50"
        >
          Grant / revoke
        </h2>
        <GrantsForm stamps={stampOptions} />
      </section>
    </main>
  );
}
