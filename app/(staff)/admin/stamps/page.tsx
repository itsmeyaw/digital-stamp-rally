import Image from "next/image";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/authorize";
import { getDb } from "@/lib/db/client";
import { listStamps } from "@/lib/stamp/stamp";
import StampForm from "../stamps-form";
import { PageHeading, SectionTitle, ListCaption } from "../section";

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
    <main className="flex flex-1 flex-col gap-10 px-6 py-12">
      <PageHeading title="Stamps">
        Create stamps and view the full stamp catalogue.
      </PageHeading>

      <section aria-labelledby="section-stamps" className="flex flex-col gap-5">
        <SectionTitle id="section-stamps">New stamp</SectionTitle>
        <StampForm />

        <ListCaption>All stamps ({stamps.length})</ListCaption>
        {stamps.length === 0 ? (
          <p className="border-brutal bg-white px-4 py-3 text-sm font-medium shadow-hard-sm">
            No stamps yet. Create the first one above.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {stamps.map((stamp) => (
              <li
                key={stamp.id}
                className={`flex flex-col items-center gap-2 border-brutal bg-white p-3 shadow-hard-sm ${
                  stamp.active ? "" : "opacity-50"
                }`}
              >
                <Image
                  src={stamp.imageUrl}
                  alt={stamp.name}
                  width={96}
                  height={96}
                  unoptimized
                  className="h-24 w-24 border-[3px] border-black object-cover"
                />
                <span className="text-center text-sm font-bold uppercase tracking-tight text-black">
                  {stamp.name}
                </span>
                {!stamp.active && (
                  <span className="border-[2px] border-black bg-[var(--color-danger)] px-1.5 text-[10px] font-bold uppercase text-white">
                    inactive
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
