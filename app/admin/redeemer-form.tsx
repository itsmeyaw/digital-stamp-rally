"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Admin Redeemer-creation form (issue #6). Posts JSON to POST /api/admin/staff
 * with role "redeemer" — no Stamp binding. On success we refresh so the new
 * Redeemer appears in the list. Errors (taken username) surface inline.
 */
export default function RedeemerForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role: "redeemer", username, password }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "Could not create the redeemer.");
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
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={submitting}
        className="flex h-12 items-center justify-center rounded-full bg-black px-5 font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
      >
        {submitting ? "Creating…" : "Create redeemer"}
      </button>
    </form>
  );
}
