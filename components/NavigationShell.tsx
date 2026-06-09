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

export function NavigationShell({ role, children }: NavigationShellProps) {
  return (
    <div data-testid="nav-shell" className="flex flex-col min-h-full">
      <header
        data-testid="nav-top-bar"
        style={{
          backgroundColor: "#000000",
          color: "#ffffff",
          borderBottom: "var(--border)",
        }}
        className="flex items-center justify-between px-6 py-3"
      >
        <span className="font-semibold text-base tracking-tight">
          Stamp Rally
        </span>
        <span
          data-testid="role-badge"
          className="text-sm font-medium border border-white px-2 py-0.5"
        >
          {ROLE_LABELS[role]}
        </span>
      </header>
      <div className="flex flex-col flex-1">{children}</div>
    </div>
  );
}
