"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Mints the User via POST /api/collect (which sets the httpOnly session cookie)
 * then navigates to the card. The cookie is set by the server; the client only
 * triggers the call and routes onward.
 */
export function CollectButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onCollect() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/collect", { method: "POST" });
      if (!res.ok) throw new Error(`collect failed: ${res.status}`);
      router.replace("/card");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setPending(false);
    }
  }

  return (
    <div className="flex w-full max-w-xs flex-col gap-3">
      <button
        type="button"
        onClick={onCollect}
        disabled={pending}
        className="flex h-12 items-center justify-center rounded-full bg-black px-5 font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
      >
        {pending ? "Creating your card…" : "Start collecting"}
      </button>
      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
