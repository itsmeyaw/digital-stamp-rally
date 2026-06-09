"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * A single managed-staff row (issue #6) with admin actions. Stampers get a
 * Stamp re-assignment dropdown (PATCH { stampId }); both Stampers and Redeemers
 * get a Deactivate action (PATCH { active: false }) — never a hard delete. All
 * actions refresh the dashboard on success.
 */
export default function StaffRow({
  member,
  stamps,
}: {
  member: {
    id: string;
    username: string;
    role: string;
    stampId: string | null;
    active: boolean;
  };
  stamps: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/staff/${member.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { error?: string };
        setError(b.error ?? "Action failed.");
        return;
      }
      router.refresh();
    } catch {
      setError("Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="flex flex-col gap-2 rounded-xl border border-black/10 bg-white p-3 dark:border-white/15 dark:bg-zinc-900">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-black dark:text-zinc-50">
          {member.username}
        </span>
        <span className="text-xs uppercase tracking-wide text-zinc-500">
          {member.role}
          {!member.active && " · inactive"}
        </span>
      </div>

      {member.role === "stamper" && member.active && (
        <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
          Bound stamp
          <select
            defaultValue={member.stampId ?? ""}
            disabled={busy}
            onChange={(e) => patch({ stampId: e.target.value })}
            className="h-9 rounded-lg border border-black/15 px-2 text-sm dark:border-white/20 dark:bg-zinc-900"
          >
            {stamps.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {member.active && (
        <button
          type="button"
          disabled={busy}
          onClick={() => patch({ active: false })}
          className="self-start rounded-full border border-red-300 px-3 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60 dark:border-red-800/60 dark:hover:bg-red-950/40"
        >
          Deactivate
        </button>
      )}

      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </li>
  );
}
