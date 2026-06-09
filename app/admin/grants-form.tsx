"use client";

import { useState } from "react";

/**
 * Admin Users/grants form (issue #8). Lets an Administrator grant or revoke any
 * Stamp from any User identified by their 6-character code.
 *
 * Grant:  POST  /api/admin/grants
 * Revoke: DELETE /api/admin/grants
 *
 * Both operations show inline feedback (success or error).
 */
export default function GrantsForm({
  stamps,
}: {
  stamps: { id: string; name: string }[];
}) {
  const [stampId, setStampId] = useState(stamps[0]?.id ?? "");
  const [userCode, setUserCode] = useState("");
  const [grantMsg, setGrantMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [revokeMsg, setRevokeMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [submitting, setSubmitting] = useState<"grant" | "revoke" | null>(null);

  async function onGrant(e: React.FormEvent) {
    e.preventDefault();
    setGrantMsg(null);
    setSubmitting("grant");
    try {
      const res = await fetch("/api/admin/grants", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ stampId, userCode: userCode.toUpperCase() }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        granted?: boolean;
        alreadyHad?: boolean;
        completionCaptured?: boolean;
        error?: string;
      };
      if (!res.ok) {
        setGrantMsg({ ok: false, text: body.error ?? "Could not grant stamp." });
        return;
      }
      if (body.alreadyHad) {
        setGrantMsg({ ok: false, text: "User already has that stamp." });
      } else {
        const extra = body.completionCaptured ? " Card completed!" : "";
        setGrantMsg({ ok: true, text: `Stamp granted.${extra}` });
      }
      setUserCode("");
    } catch {
      setGrantMsg({ ok: false, text: "Something went wrong. Please try again." });
    } finally {
      setSubmitting(null);
    }
  }

  async function onRevoke(e: React.FormEvent) {
    e.preventDefault();
    setRevokeMsg(null);
    setSubmitting("revoke");
    try {
      const res = await fetch("/api/admin/grants", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ stampId, userCode: userCode.toUpperCase() }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        revoked?: boolean;
        error?: string;
      };
      if (!res.ok) {
        setRevokeMsg({ ok: false, text: body.error ?? "Could not revoke stamp." });
        return;
      }
      if (body.revoked) {
        setRevokeMsg({ ok: true, text: "Stamp revoked." });
      } else {
        setRevokeMsg({ ok: false, text: "User did not have that stamp." });
      }
      setUserCode("");
    } catch {
      setRevokeMsg({ ok: false, text: "Something went wrong. Please try again." });
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div className="flex w-full max-w-sm flex-col gap-6">
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-left text-sm font-medium">
          Stamp
          <select
            value={stampId}
            onChange={(e) => setStampId(e.target.value)}
            disabled={stamps.length === 0}
            className="h-11 rounded-lg border border-black/15 px-3 dark:border-white/20 dark:bg-zinc-900"
          >
            {stamps.length === 0 ? (
              <option value="">No stamps — create one first</option>
            ) : (
              stamps.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))
            )}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-left text-sm font-medium">
          User code (6 characters)
          <input
            value={userCode}
            onChange={(e) => setUserCode(e.target.value.toUpperCase())}
            maxLength={6}
            placeholder="ABC123"
            className="h-11 rounded-lg border border-black/15 px-3 uppercase tracking-widest dark:border-white/20 dark:bg-zinc-900"
          />
        </label>
        <div className="flex gap-3">
          <form onSubmit={onGrant} className="flex-1">
            <button
              type="submit"
              disabled={submitting !== null || stamps.length === 0 || userCode.length !== 6}
              className="w-full h-11 rounded-full bg-black px-4 font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
            >
              {submitting === "grant" ? "Granting…" : "Grant"}
            </button>
          </form>
          <form onSubmit={onRevoke} className="flex-1">
            <button
              type="submit"
              disabled={submitting !== null || stamps.length === 0 || userCode.length !== 6}
              className="w-full h-11 rounded-full border border-black/20 px-4 font-medium text-black transition-colors hover:bg-zinc-100 disabled:opacity-60 dark:border-white/20 dark:text-zinc-50 dark:hover:bg-zinc-800"
            >
              {submitting === "revoke" ? "Revoking…" : "Revoke"}
            </button>
          </form>
        </div>
        {grantMsg && (
          <p
            role="alert"
            className={`text-sm ${grantMsg.ok ? "text-green-600 dark:text-green-400" : "text-red-600"}`}
          >
            Grant: {grantMsg.text}
          </p>
        )}
        {revokeMsg && (
          <p
            role="alert"
            className={`text-sm ${revokeMsg.ok ? "text-green-600 dark:text-green-400" : "text-red-600"}`}
          >
            Revoke: {revokeMsg.text}
          </p>
        )}
      </div>
    </div>
  );
}
