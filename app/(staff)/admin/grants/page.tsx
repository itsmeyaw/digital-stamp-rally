import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/authorize";
import { getDb } from "@/lib/db/client";
import { listStamps } from "@/lib/stamp/stamp";
import GrantsForm from "../grants-form";
import { PageHeading, SectionTitle } from "../section";

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
    <main className="flex flex-1 flex-col gap-10 px-6 py-12">
      <PageHeading title="Users / grants">
        Grant a stamp to fix a missed scan, or revoke one to correct a mis-scan.
        Revoking a middle stamp compacts the remaining stamps automatically.
      </PageHeading>

      <section aria-labelledby="section-grants" className="flex flex-col gap-5">
        <SectionTitle id="section-grants">Grant / revoke</SectionTitle>
        <GrantsForm stamps={stampOptions} />
      </section>
    </main>
  );
}
