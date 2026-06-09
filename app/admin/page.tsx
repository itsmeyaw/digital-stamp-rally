import Image from "next/image";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/authorize";
import { getDb } from "@/lib/db/client";
import { listStamps } from "@/lib/stamp/stamp";
import { listStaff } from "@/lib/staff/staff-admin";
import StampForm from "./stamps-form";
import StamperForm from "./stamper-form";
import RedeemerForm from "./redeemer-form";
import StaffRow from "./staff-row";

/**
 * Administrator dashboard (ADR-0001: admin -> /admin). Adds the Stamps section
 * (issue #5) and the Stampers/Redeemers sections (issue #6): creation forms plus
 * server-fetched lists with re-assign/deactivate actions. Any visitor without an
 * Admin session is sent back to welcome.
 */
export default async function AdminPage() {
  const session = await getSession();
  if (!requireRole(session, "admin")) redirect("/welcome");

  const db = getDb();
  const stamps = await listStamps(db);
  const staff = await listStaff(db);
  const stampOptions = stamps.map((s) => ({ id: s.id, name: s.name }));
  const stampers = staff.filter((s) => s.role === "stamper");
  const redeemers = staff.filter((s) => s.role === "redeemer");

  return (
    <main className="flex flex-1 flex-col gap-10 bg-zinc-50 px-6 py-12 dark:bg-black">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Admin dashboard
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Create and review Stamps, Stampers, and Redeemers.
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

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium text-black dark:text-zinc-50">
          New stamper
        </h2>
        <StamperForm stamps={stampOptions} />
        <h3 className="text-base font-medium text-black dark:text-zinc-50">
          Stampers ({stampers.length})
        </h3>
        {stampers.length === 0 ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            No stampers yet.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            {stampers.map((member) => (
              <StaffRow key={member.id} member={member} stamps={stampOptions} />
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium text-black dark:text-zinc-50">
          New redeemer
        </h2>
        <RedeemerForm />
        <h3 className="text-base font-medium text-black dark:text-zinc-50">
          Redeemers ({redeemers.length})
        </h3>
        {redeemers.length === 0 ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            No redeemers yet.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            {redeemers.map((member) => (
              <StaffRow key={member.id} member={member} stamps={stampOptions} />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
