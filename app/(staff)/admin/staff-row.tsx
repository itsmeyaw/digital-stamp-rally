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
    <li
      className={`flex flex-col gap-3 border-brutal bg-white p-4 shadow-hard-sm ${
        member.active ? "" : "opacity-60"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-display text-base uppercase text-black">
          {member.username}
        </span>
        <span className="border-[3px] border-black bg-[var(--color-accent)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-black">
          {member.role}
          {!member.active && " · off"}
        </span>
      </div>

      {member.role === "stamper" && member.active && (
        <label className="flex flex-col gap-1 text-xs font-bold uppercase tracking-widest text-black/60">
          Bound stamp
          <select
            defaultValue={member.stampId ?? ""}
            disabled={busy}
            onChange={(e) => patch({ stampId: e.target.value })}
            className="h-10 border-[3px] border-black bg-white px-2 text-sm font-medium shadow-hard-sm focus:outline-none"
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
          className="btn-press self-start border-[3px] border-black bg-[var(--color-danger)] px-3 py-1 text-xs font-bold uppercase tracking-wide text-white shadow-hard-sm disabled:opacity-60"
        >
          Deactivate
        </button>
      )}

      {error && (
        <p
          role="alert"
          className="border-[3px] border-black bg-[var(--color-danger)] px-2 py-1 text-xs font-bold text-white"
        >
          {error}
        </p>
      )}
    </li>
  );
}
