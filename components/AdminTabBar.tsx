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
 *
 * Brutalist styling: a thick black top rail, fat dividers between tabs, and an
 * electric-blue active state with white uppercase signage type. The active tab
 * lifts very slightly so it reads as a pressed physical key.
 */
export function AdminTabBar() {
  const pathname = usePathname();
  const router = useRouter();

  const current =
    TABS.find((t) => pathname.startsWith(t.value))?.value ?? "/admin/stamps";

  return (
    <Tabs.Root value={current} onValueChange={(v) => router.push(v)}>
      <Tabs.List
        className="fixed bottom-0 left-1/2 z-20 flex w-full max-w-app -translate-x-1/2 border-t-4 border-black bg-[var(--color-bg)]"
        style={{ backgroundColor: "var(--color-bg, #FFF4E0)" }}
      >
        {TABS.map((tab, i) => (
          <Tabs.Trigger
            key={tab.value}
            value={tab.value}
            className={`flex-1 py-4 text-sm font-bold uppercase tracking-widest transition-colors data-[state=active]:bg-[#0057FF] border-l-4 last:border-r-4 border-black 
                data-[state=active]:text-white data-[state=inactive]:bg-transparent data-[state=inactive]:text-black data-[state=inactive]:hover:bg-[var(--color-accent)]`}
          >
            {tab.label}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
    </Tabs.Root>
  );
}
