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
    <main className="flex flex-1 flex-col items-center gap-8 bg-[var(--color-bg)] px-6 py-12">
      <h1 className="text-3xl font-black tracking-tight text-black uppercase">
        Prize Redemption
      </h1>

      {/* Code input */}
      <div className="flex flex-col gap-4 w-full max-w-sm">
        <label
          htmlFor="code-input"
          className="text-sm font-bold text-black uppercase tracking-wide"
        >
          6-character user code
        </label>
        <input
          id="code-input"
          type="text"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="XXXXXX"
          className="border-brutal shadow-hard bg-white px-4 font-mono text-xl uppercase tracking-widest text-black placeholder-zinc-400 focus:outline-none w-full min-h-[48px]"
        />
        <button
          type="button"
          disabled={trimmedCode.length !== 6 || loading}
          onClick={handleLookup}
          className="border-brutal shadow-hard bg-black px-6 font-bold text-white disabled:opacity-40 min-h-[48px] w-full uppercase"
        >
          Look up
        </button>
      </div>

      {/* Lookup error */}
      {lookupError && (
        <div className="border-brutal bg-red-100 px-4 py-3 w-full max-w-sm">
          <p className="text-sm font-bold text-red-700">
            {lookupError}
          </p>
        </div>
      )}

      {/* Status display */}
      {lookup && (
        <div className="flex flex-col gap-4 w-full max-w-sm">
          {/* Result card */}
          <div
            data-testid="redeem-result-card"
            className={`border-brutal shadow-hard px-6 py-5 ${
              lookup.status === "eligible"
                ? "bg-[#CCFF66]"
                : lookup.status === "already_redeemed"
                  ? "bg-zinc-200"
                  : "bg-yellow-100"
            }`}
          >
            <p className="text-2xl font-black text-black">
              {statusLabel()}
            </p>
            {lookup.status === "already_redeemed" && (
              <p className="text-sm font-medium text-zinc-600 mt-1">
                This prize has already been claimed.
              </p>
            )}
          </div>

          {/* Redeem button — only shown when eligible */}
          {lookup.status === "eligible" && (
            <button
              type="button"
              disabled={!canRedeem || loading}
              onClick={handleRedeem}
              style={{ backgroundColor: "#FF6600" }}
              className="border-brutal shadow-hard px-6 font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed min-h-[48px] w-full uppercase bg-[var(--color-secondary)]"
            >
              {redeemResult?.redeemed ? "Redeemed!" : "Redeem Prize"}
            </button>
          )}

          {/* Redeem result feedback */}
          {redeemResult?.redeemed && (
            <div className="border-brutal bg-[#CCFF66] px-4 py-3">
              <p className="font-bold text-black">
                Prize successfully redeemed.
              </p>
            </div>
          )}
          {redeemResult?.alreadyRedeemed && (
            <p className="text-sm font-medium text-zinc-600">
              This user has already redeemed their prize.
            </p>
          )}
          {redeemError && (
            <div className="border-brutal bg-red-100 px-4 py-3">
              <p className="text-sm font-bold text-red-700">
                {redeemError}
              </p>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
