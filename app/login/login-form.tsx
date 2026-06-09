"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface LoginFormProps {
  /** Safe same-origin path to navigate to after login. Falls back to the
   * role-based landing returned by the API when absent. */
  returnTo?: string;
}

/**
 * Staff login form. Posts username + password to POST /api/login; on success
 * the server sets the httpOnly session cookie and returns the role-based
 * landing path. If `returnTo` is provided (and was sanitized server-side) we
 * navigate there instead. On failure we show an inline error and mint no
 * session.
 */
export default function LoginForm({ returnTo }: LoginFormProps = {}) {
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
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        setError("Incorrect username or password.");
        return;
      }
      const { landing } = (await res.json()) as { landing: string };
      // Use returnTo if provided; otherwise fall back to the role-based landing.
      router.replace(returnTo || landing);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-xs flex-col gap-5">
      <label className="flex flex-col gap-1.5 text-left text-xs font-bold uppercase tracking-widest">
        Username
        <input
          name="username"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          className="h-12 bg-white px-3 font-medium focus:outline-none focus:-translate-y-0.5 focus:shadow-[8px_8px_0px_#0A0A0A] transition-all"
          style={{ border: "var(--border)", boxShadow: "var(--shadow)" }}
        />
      </label>
      <label className="flex flex-col gap-1.5 text-left text-xs font-bold uppercase tracking-widest">
        Password
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="h-12 bg-white px-3 font-medium focus:outline-none focus:-translate-y-0.5 focus:shadow-[8px_8px_0px_#0A0A0A] transition-all"
          style={{ border: "var(--border)", boxShadow: "var(--shadow)" }}
        />
      </label>
      {error && (
        <p
          role="alert"
          className="border-[3px] border-black bg-[var(--color-danger)] px-3 py-2 text-sm font-bold text-white"
        >
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={submitting}
        className="btn-press flex h-13 items-center justify-center px-5 font-display text-lg uppercase tracking-wide text-white disabled:opacity-60"
        style={{
          background: "var(--color-primary)",
          border: "var(--border)",
          boxShadow: "var(--shadow)",
          minHeight: "52px",
        }}
      >
        {submitting ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
