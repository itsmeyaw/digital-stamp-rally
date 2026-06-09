"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fieldLabel, fieldInput, fieldSelect, btnPrimary, errorBanner } from "./field-styles";

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
    <form onSubmit={onSubmit} className="flex w-full flex-col gap-4">
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
      <label className={fieldLabel}>
        Bound stamp
        <select
          name="stampId"
          value={stampId}
          onChange={(e) => setStampId(e.target.value)}
          required
          disabled={stamps.length === 0}
          className={fieldSelect}
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
        <p role="alert" className={errorBanner}>
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={submitting || stamps.length === 0}
        className={btnPrimary}
      >
        {submitting ? "Creating…" : "Create stamper"}
      </button>
    </form>
  );
}
