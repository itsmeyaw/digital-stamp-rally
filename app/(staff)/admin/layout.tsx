import type { ReactNode } from "react";
import { AdminTabBar } from "@/components/AdminTabBar";

/**
 * Layout for admin sub-pages (/admin/stamps, /admin/staff, /admin/grants).
 *
 * Adds the bottom tab bar beneath each sub-page's content. The top-level
 * NavigationShell is already applied by app/(staff)/layout.tsx.
 *
 * The `pb-16` padding prevents page content from being hidden behind the
 * fixed-position tab bar on mobile.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col flex-1">
      <div className="flex flex-col flex-1 pb-16">{children}</div>
      <AdminTabBar />
    </div>
  );
}
