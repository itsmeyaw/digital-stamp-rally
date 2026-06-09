import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/authorize";

/**
 * Redeemer landing surface (ADR-0004: redeemer -> /redeem, a sibling of the
 * Stamper scan screen). Minimal authenticated shell — the prize lookup +
 * one-time redemption flow arrives in issue #10. Any visitor without a Redeemer
 * session is sent back to welcome.
 */
export default async function RedeemPage() {
  const session = await getSession();
  if (!requireRole(session, "redeemer")) redirect("/welcome");

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 bg-zinc-50 px-6 py-16 text-center dark:bg-black">
      <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
        Redeem
      </h1>
      <p className="max-w-sm text-zinc-600 dark:text-zinc-400">
        The prize redemption flow arrives soon.
      </p>
    </main>
  );
}
