import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/authorize";
import { getDb } from "@/lib/db/client";
import { listStamps } from "@/lib/stamp/stamp";
import { listStaff } from "@/lib/staff/staff-admin";
import StamperForm from "../stamper-form";
import RedeemerForm from "../redeemer-form";
import StaffRow from "../staff-row";
import { PageHeading, SectionTitle, ListCaption } from "../section";

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
    <main className="flex flex-1 flex-col gap-10 px-6 py-12">
      <PageHeading title="Staff">
        Create and manage stampers and redeemers.
      </PageHeading>

      <section aria-labelledby="section-stampers" className="flex flex-col gap-5">
        <SectionTitle id="section-stampers">Stampers</SectionTitle>
        <ListCaption>New stamper</ListCaption>
        <StamperForm stamps={stampOptions} />
        <ListCaption>All stampers ({stampers.length})</ListCaption>
        {stampers.length === 0 ? (
          <p className="border-brutal bg-white px-4 py-3 text-sm font-medium shadow-hard-sm">
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

      <section aria-labelledby="section-redeemers" className="flex flex-col gap-5">
        <SectionTitle id="section-redeemers">Redeemers</SectionTitle>
        <ListCaption>New redeemer</ListCaption>
        <RedeemerForm />
        <ListCaption>All redeemers ({redeemers.length})</ListCaption>
        {redeemers.length === 0 ? (
          <p className="border-brutal bg-white px-4 py-3 text-sm font-medium shadow-hard-sm">
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
