import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/authorize";
import { getDb } from "@/lib/db/client";
import { listStamps } from "@/lib/stamp/stamp";
import { listStaff } from "@/lib/staff/staff-admin";
import StamperForm from "../stamper-form";
import RedeemerForm from "../redeemer-form";
import StaffRow from "../staff-row";

/**
 * Admin Staff sub-page (/admin/staff).
 *
 * Shows stamper and redeemer creation forms, plus the full staff list
 * with reassign/deactivate actions.
 * Requires an active admin session; redirects to /welcome otherwise.
 */
export default async function AdminStaffPage() {
  const session = await getSession();
  if (!requireRole(session, "admin")) redirect("/welcome");

  const db = getDb();
  const stamps = await listStamps(db);
  const staff = await listStaff(db);
  const stampOptions = stamps.map((s) => ({ id: s.id, name: s.name }));
  const stampers = staff.filter((s) => s.role === "stamper");
  const redeemers = staff.filter((s) => s.role === "redeemer");

  return (
    <main className="flex flex-1 flex-col gap-12 bg-zinc-50 px-6 py-12 dark:bg-black">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Staff
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Create and manage stampers and redeemers.
        </p>
      </header>

      {/* ── Stampers ───────────────────────────────────────────── */}
      <section aria-labelledby="section-stampers" className="flex flex-col gap-4">
        <h2
          id="section-stampers"
          className="text-xl font-semibold text-black dark:text-zinc-50"
        >
          Stampers
        </h2>
        <h3 className="text-base font-medium text-black dark:text-zinc-50">
          New stamper
        </h3>
        <StamperForm stamps={stampOptions} />
        <h3 className="text-base font-medium text-black dark:text-zinc-50">
          All stampers ({stampers.length})
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

      {/* ── Redeemers ──────────────────────────────────────────── */}
      <section aria-labelledby="section-redeemers" className="flex flex-col gap-4">
        <h2
          id="section-redeemers"
          className="text-xl font-semibold text-black dark:text-zinc-50"
        >
          Redeemers
        </h2>
        <h3 className="text-base font-medium text-black dark:text-zinc-50">
          New redeemer
        </h3>
        <RedeemerForm />
        <h3 className="text-base font-medium text-black dark:text-zinc-50">
          All redeemers ({redeemers.length})
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
