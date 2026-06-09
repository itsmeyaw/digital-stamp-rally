"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Admin Stamper-creation form (issue #6). Posts JSON to POST /api/admin/staff
 * with role "stamper" and the chosen Stamp id; a Stamper is bound to exactly one
 * existing Stamp at creation. On success we refresh so the new Stamper appears
 * in the list. Errors (taken username, missing stamp) surface inline.
 */
export default function StamperForm({
  stamps,
}: {
  stamps: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [stampId, setStampId] = useState(stamps[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!stampId) {
      setError("Choose a stamp to bind this stamper to.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role: "stamper", username, password, stampId }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "Could not create the stamper.");
        return;
      }
      setUsername("");
      setPassword("");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-sm flex-col gap-4">
      <label className="flex flex-col gap-1 text-left text-sm font-medium">
        Username
        <input
          name="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          className="h-11 rounded-lg border border-black/15 px-3 dark:border-white/20 dark:bg-zinc-900"
        />
      </label>
      <label className="flex flex-col gap-1 text-left text-sm font-medium">
        Password
        <input
          name="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="h-11 rounded-lg border border-black/15 px-3 dark:border-white/20 dark:bg-zinc-900"
        />
      </label>
      <label className="flex flex-col gap-1 text-left text-sm font-medium">
        Bound stamp
        <select
          name="stampId"
          value={stampId}
          onChange={(e) => setStampId(e.target.value)}
          required
          disabled={stamps.length === 0}
          className="h-11 rounded-lg border border-black/15 px-3 dark:border-white/20 dark:bg-zinc-900"
        >
          {stamps.length === 0 ? (
            <option value="">Create a stamp first</option>
          ) : (
            stamps.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))
          )}
        </select>
      </label>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={submitting || stamps.length === 0}
        className="flex h-12 items-center justify-center rounded-full bg-black px-5 font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
      >
        {submitting ? "Creating…" : "Create stamper"}
      </button>
    </form>
  );
}
