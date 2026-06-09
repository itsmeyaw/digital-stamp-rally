import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { eq } from "drizzle-orm";
import { staff, stamps } from "@/lib/db/schema";
import { resolveDeepLink } from "@/lib/auth/deep-link-router";

export default async function DeepLinkPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code: rawCode } = await params; // Next.js 15 — params is a Promise
  const code = rawCode.trim().toUpperCase();

  const session = await getSession();

  // Session check BEFORE code validation (enumeration guard)
  if (!session) {
    redirect(`/login?returnTo=/s/${code}`);
  }

  let stamperHasBoundStamp = true; // default for non-stamper roles
  if (session.role === "stamper") {
    const db = getDb();
    const [stamperRow] = await db
      .select({ stampId: staff.stampId })
      .from(staff)
      .where(eq(staff.id, session.sub))
      .limit(1);

    if (!stamperRow?.stampId) {
      stamperHasBoundStamp = false;
    } else {
      // Check if bound stamp is still active
      const [stampRow] = await db
        .select({ active: stamps.active })
        .from(stamps)
        .where(eq(stamps.id, stamperRow.stampId))
        .limit(1);
      if (!stampRow?.active) stamperHasBoundStamp = false;
    }
  }

  const destination = resolveDeepLink({ session, code, stamperHasBoundStamp });

  if (destination === "degraded") {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
        <h1 className="font-display text-4xl uppercase text-black">Scan</h1>
        <p className="max-w-sm border-brutal bg-white px-4 py-3 font-medium shadow-hard-sm">
          Your account has no active bound stamp. Please contact an
          administrator.
        </p>
      </main>
    );
  }

  redirect(destination);
}
