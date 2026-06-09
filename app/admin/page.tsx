import Image from "next/image";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/authorize";
import { getDb } from "@/lib/db/client";
import { listStamps } from "@/lib/stamp/stamp";
import StampForm from "./stamps-form";

/**
 * Administrator dashboard (ADR-0001: admin -> /admin). This slice (issue #5)
 * adds the Stamps section: a creation form plus a list of all Stamps fetched
 * server-side. Stamper/Redeemer management arrives in #6/#8. Any visitor without
 * an Admin session is sent back to welcome.
 */
export default async function AdminPage() {
  const session = await getSession();
  if (!requireRole(session, "admin")) redirect("/welcome");

  const stamps = await listStamps(getDb());

  return (
    <main className="flex flex-1 flex-col gap-10 bg-zinc-50 px-6 py-12 dark:bg-black">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Admin dashboard
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Create and review Stamps.
        </p>
      </header>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium text-black dark:text-zinc-50">
          New stamp
        </h2>
        <StampForm />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium text-black dark:text-zinc-50">
          Stamps ({stamps.length})
        </h2>
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
