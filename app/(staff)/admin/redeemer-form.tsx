"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fieldLabel, fieldInput, btnPrimary, errorBanner } from "./field-styles";

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
      <label className={fieldLabel}>
        Username
        <input
          name="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          className={fieldInput}
        />
      </label>
      <label className={fieldLabel}>
        Password
        <input
          name="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className={fieldInput}
        />
      </label>
      {error && (
        <p role="alert" className={errorBanner}>
          {error}
        </p>
      )}
      <button type="submit" disabled={submitting} className={btnPrimary}>
        {submitting ? "Creating…" : "Create redeemer"}
      </button>
    </form>
  );
}
