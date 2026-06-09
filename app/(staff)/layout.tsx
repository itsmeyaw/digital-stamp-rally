import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { NavigationShell } from "@/components/NavigationShell";
import type { Role } from "@/lib/auth/token";
import type { ReactNode } from "react";

/**
 * Layout for staff-facing pages (/scan, /redeem, /admin).
 *
 * Reads the authenticated session and wraps all staff routes with the
 * NavigationShell top bar showing the user's role badge.
 *
 * Unauthenticated visitors are redirected to /welcome; the individual
 * pages further enforce their own role requirement.
 */
export default async function StaffLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/welcome");

  const staffRoles: Role[] = ["stamper", "redeemer", "admin"];
  if (!staffRoles.includes(session.role)) redirect("/welcome");

  return (
    <NavigationShell role={session.role as Role}>
      {children}
    </NavigationShell>
  );
}
