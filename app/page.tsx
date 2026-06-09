import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { resolveLanding } from "@/lib/auth/landing";

/**
 * App entry. Reads the session and routes per ADR-0001:
 * valid user session -> /card, otherwise -> /welcome (and staff -> their
 * surfaces, added in later slices).
 */
export default async function Home() {
  const session = await getSession();
  redirect(resolveLanding(session));
}
