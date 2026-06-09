"use client";

import * as Tabs from "@radix-ui/react-tabs";
import { usePathname, useRouter } from "next/navigation";

const TABS = [
  { value: "/admin/stamps", label: "Stamps" },
  { value: "/admin/staff", label: "Staff" },
  { value: "/admin/grants", label: "Grants" },
] as const;

/**
 * Bottom tab bar for admin sub-pages.
 *
 * Active tab value is derived from `usePathname()` so the browser URL drives
 * which tab appears highlighted. Navigates via `router.push()` on tab click.
 *
 * Accessibility: Radix Tabs provides ARIA roles (tablist, tab) and keyboard
 * navigation (arrow keys, Home, End) out of the box.
 */
export function AdminTabBar() {
  const pathname = usePathname();
  const router = useRouter();

  const current =
    TABS.find((t) => pathname.startsWith(t.value))?.value ?? "/admin/stamps";

  return (
    <Tabs.Root value={current} onValueChange={(v) => router.push(v)}>
      <Tabs.List
        className="fixed bottom-0 left-0 right-0 flex border-t-[3px] border-black"
        style={{ backgroundColor: "var(--color-bg, #F5F5F0)" }}
      >
        {TABS.map((tab) => (
          <Tabs.Trigger
            key={tab.value}
            value={tab.value}
            className="flex-1 py-3 text-sm font-semibold data-[state=active]:bg-[#0057FF] data-[state=active]:text-white data-[state=inactive]:bg-[#F5F5F0] data-[state=inactive]:text-black"
          >
            {tab.label}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
    </Tabs.Root>
  );
}
