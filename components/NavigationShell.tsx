import type { Role } from "@/lib/auth/token";
import type { ReactNode } from "react";

interface NavigationShellProps {
  role: Role;
  children: ReactNode;
}

const ROLE_LABELS: Record<Role, string> = {
  user: "User",
  stamper: "Stamper",
  redeemer: "Redeemer",
  admin: "Admin",
};

/**
 * Staff top bar. Black slab with the wordmark on the left and a hot-yellow
 * role badge punched into the right. The badge keeps the bar from reading as a
 * plain header — it's a sticker, slightly tilted, in the carnival-brutalist key.
 *
 * The test suite asserts the bar's background is #000000 and its text #ffffff,
 * so those two stay as inline styles.
 */
export function NavigationShell({ role, children }: NavigationShellProps) {
  return (
    <div data-testid="nav-shell" className="flex min-h-full flex-col">
      <header
        data-testid="nav-top-bar"
        style={{
          backgroundColor: "#000000",
          color: "#ffffff",
          borderBottom: "var(--border)",
        }}
        className="flex items-center justify-between px-5 py-3"
      >
        <span className="font-display text-xl uppercase tracking-tight">
          Stamp Rally
        </span>
        <span
          data-testid="role-badge"
          className="rotate-2 border-[3px] border-black bg-[var(--color-accent)] px-3 py-1 text-xs font-bold uppercase tracking-widest text-black shadow-[3px_3px_0px_#000000]"
        >
          {ROLE_LABELS[role]}
        </span>
      </header>
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
