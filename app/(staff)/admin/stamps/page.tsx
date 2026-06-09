import Image from "next/image";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/authorize";
import { getDb } from "@/lib/db/client";
import { listStamps } from "@/lib/stamp/stamp";
import StampForm from "../stamps-form";

/**
 * Admin Stamps sub-page (/admin/stamps).
 *
 * Shows the stamp creation form and the full list of stamps.
 * Requires an active admin session; redirects to /welcome otherwise.
 */
export default async function AdminStampsPage() {
  const session = await getSession();
  if (!requireRole(session, "admin")) redirect("/welcome");

  const db = getDb();
  const stamps = await listStamps(db);

  return (
    <main className="flex flex-1 flex-col gap-12 bg-zinc-50 px-6 py-12 dark:bg-black">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Stamps
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Create stamps and view the full stamp catalogue.
        </p>
      </header>

      {/* ── Stamps ─────────────────────────────────────────────── */}
      <section aria-labelledby="section-stamps" className="flex flex-col gap-4">
        <h2
          id="section-stamps"
          className="text-xl font-semibold text-black dark:text-zinc-50"
        >
          New stamp
        </h2>
        <StampForm />
        <h3 className="text-base font-medium text-black dark:text-zinc-50">
          All stamps ({stamps.length})
        </h3>
        {stamps.length === 0 ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            No stamps yet. Create the first one above.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {stamps.map((stamp) => (
              <li
                key={stamp.id}
                className="flex flex-col items-center gap-2 rounded-xl border border-black/10 bg-white p-3 dark:border-white/15 dark:bg-zinc-900"
              >
                <Image
                  src={stamp.imageUrl}
                  alt={stamp.name}
                  width={96}
                  height={96}
                  unoptimized
                  className="h-24 w-24 rounded-lg object-cover"
                />
                <span className="text-center text-sm font-medium text-black dark:text-zinc-50">
                  {stamp.name}
                </span>
                {!stamp.active && (
                  <span className="text-xs text-zinc-500">inactive</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
