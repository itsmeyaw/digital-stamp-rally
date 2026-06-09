"use client";

/**
 * Redeemer scan screen (issue #10).
 *
 * A Redeemer (or Administrator) enters a User's 6-character code, looks them
 * up, and — if eligible — redeems their prize exactly once.
 *
 * Status display:
 *   eligible      → "5/5 — eligible"         + Redeem button enabled
 *   blocked       → "N/5 — blocked"           + Redeem button disabled
 *   already_redeemed → "Already redeemed"     + Redeem button disabled
 *
 * The page itself is a client component so it can hold the lookup/redeem state
 * without a server round-trip framework. Auth is enforced server-side on the
 * API route; if the session is somehow missing the API returns 403 and the UI
 * shows an error.
 */
import { useState } from "react";

type RedeemStatus = "eligible" | "blocked" | "already_redeemed";

interface CardResult {
  activeStamps: string[];
  slots: (string | null)[];
  complete: boolean;
  bonusCount: number;
}

interface LookupResult {
  status: RedeemStatus;
  activeStampCount: number;
  completionExists: boolean;
  redemptionExists: boolean;
  card: CardResult;
}

const SLOT_COUNT = 5;

export default function RedeemPage() {
  const [code, setCode] = useState("");
  const [lookup, setLookup] = useState<LookupResult | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [redeemResult, setRedeemResult] = useState<{
    redeemed: boolean;
    alreadyRedeemed: boolean;
  } | null>(null);
  const [redeemError, setRedeemError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const trimmedCode = code.trim().toUpperCase();

  const handleLookup = async () => {
    if (trimmedCode.length !== 6) return;
    setLoading(true);
    setLookup(null);
    setLookupError(null);
    setRedeemResult(null);
    setRedeemError(null);
    try {
      const res = await fetch(`/api/redeem?code=${encodeURIComponent(trimmedCode)}`);
      if (res.status === 403) {
        setLookupError("Not authorized. Please log in as a Redeemer.");
        return;
      }
      if (res.status === 404) {
        setLookupError("User not found. Check the code and try again.");
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setLookupError((body as { error?: string }).error ?? "Lookup failed.");
        return;
      }
      const data: LookupResult = await res.json();
      setLookup(data);
    } catch {
      setLookupError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRedeem = async () => {
    if (!lookup || lookup.status !== "eligible") return;
    setLoading(true);
    setRedeemResult(null);
    setRedeemError(null);
    try {
      const res = await fetch("/api/redeem", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userCode: trimmedCode }),
      });
      if (res.status === 403) {
        setRedeemError("Not authorized.");
        return;
      }
      if (res.status === 422) {
        const body = await res.json();
        setRedeemError(
          `Not completed — ${(body as { card?: CardResult }).card?.activeStamps.length ?? "?"}/${SLOT_COUNT} stamps collected.`,
        );
        return;
      }
      if (res.status === 404) {
        setRedeemError("User not found.");
        return;
      }
      if (!res.ok) {
        setRedeemError("Redemption failed.");
        return;
      }
      const data = await res.json();
      setRedeemResult(data);
      // Refresh lookup state to reflect new status
      if (data.redeemed) {
        setLookup((prev) =>
          prev ? { ...prev, status: "already_redeemed", redemptionExists: true } : prev,
        );
      }
    } catch {
      setRedeemError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const statusLabel = (): string => {
    if (!lookup) return "";
    switch (lookup.status) {
      case "eligible":
        return `${lookup.activeStampCount}/${SLOT_COUNT} — eligible`;
      case "blocked":
        return `${lookup.activeStampCount}/${SLOT_COUNT} — blocked`;
      case "already_redeemed":
        return "Already redeemed";
    }
  };

  const statusColor = (): string => {
    if (!lookup) return "";
    switch (lookup.status) {
      case "eligible":
        return "text-green-600 dark:text-green-400";
      case "blocked":
        return "text-yellow-600 dark:text-yellow-400";
      case "already_redeemed":
        return "text-zinc-500 dark:text-zinc-400";
    }
  };

  const canRedeem =
    lookup?.status === "eligible" && !redeemResult?.redeemed;

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-zinc-50 px-6 py-16 text-center dark:bg-black">
      <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
        Prize Redemption
      </h1>

      {/* Code input */}
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <label
          htmlFor="code-input"
          className="text-sm font-medium text-zinc-700 dark:text-zinc-300 text-left"
        >
          6-character user code
        </label>
        <div className="flex gap-2">
          <input
            id="code-input"
            type="text"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="XXXXXX"
            className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-mono uppercase tracking-widest text-black shadow-sm focus:outline-none focus:ring-2 focus:ring-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
          <button
            type="button"
            disabled={trimmedCode.length !== 6 || loading}
            onClick={handleLookup}
            className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-black"
          >
            Lookup
          </button>
        </div>
      </div>

      {/* Lookup error */}
      {lookupError && (
        <p className="max-w-xs text-sm text-red-600 dark:text-red-400">
          {lookupError}
        </p>
      )}

      {/* Status display */}
      {lookup && (
        <div className="flex flex-col gap-4 w-full max-w-xs">
          <p className={`text-xl font-semibold ${statusColor()}`}>
            {statusLabel()}
          </p>

          {/* Redeem button */}
          <button
            type="button"
            disabled={!canRedeem || loading}
            onClick={handleRedeem}
            className="w-full rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {redeemResult?.redeemed ? "Redeemed!" : "Redeem Prize"}
          </button>

          {/* Redeem result feedback */}
          {redeemResult?.redeemed && (
            <p className="text-sm text-green-600 dark:text-green-400">
              Prize successfully redeemed.
            </p>
          )}
          {redeemResult?.alreadyRedeemed && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              This user has already redeemed their prize.
            </p>
          )}
          {redeemError && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {redeemError}
            </p>
          )}
        </div>
      )}
    </main>
  );
}
