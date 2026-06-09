import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/authorize";
import { getDb } from "@/lib/db/client";
import { eq } from "drizzle-orm";
import { staff, stamps } from "@/lib/db/schema";
import ScanClient from "./ScanClient";

/**
 * Stamper scan/grant surface (issue #7).
 *
 * Server component: authenticates the Stamper, resolves their bound Stamp,
 * and passes stamp info to the client component for the interactive grant flow.
 */
export default async function ScanPage() {
  const session = await getSession();
  if (!requireRole(session, "stamper")) redirect("/welcome");

  const db = getDb();

  // Load the stamper's staff row to get their bound stampId
  const [stamperRow] = await db
    .select({ stampId: staff.stampId })
    .from(staff)
    .where(eq(staff.id, session!.sub))
    .limit(1);

  // If the stamper has no bound stamp, show a degraded UI
  if (!stamperRow?.stampId) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
        <h1 className="font-display text-4xl uppercase text-black">Scan</h1>
        <p className="max-w-sm border-brutal bg-white px-4 py-3 font-medium shadow-hard-sm">
          Your account has no bound stamp. Please contact an administrator.
        </p>
      </main>
    );
  }

  const [stamp] = await db
    .select({ name: stamps.name, imageUrl: stamps.imageUrl })
    .from(stamps)
    .where(eq(stamps.id, stamperRow.stampId))
    .limit(1);

  if (!stamp) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
        <h1 className="font-display text-4xl uppercase text-black">Scan</h1>
        <p className="max-w-sm border-brutal bg-white px-4 py-3 font-medium shadow-hard-sm">
          Bound stamp not found. Please contact an administrator.
        </p>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col items-center gap-8 px-6 py-12">
      <h1 className="font-display text-4xl uppercase text-black">Scan</h1>
      <ScanClient stampName={stamp.name} stampImageUrl={stamp.imageUrl} />
    </main>
  );
}
