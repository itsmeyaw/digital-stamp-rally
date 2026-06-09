"use client";

import { useState, useRef, useCallback } from "react";

interface GrantResult {
  granted: boolean;
  alreadyHad: boolean;
  completionCaptured: boolean;
  card: {
    activeStamps: string[];
    slots: (string | null)[];
    complete: boolean;
    bonusCount: number;
  };
}

interface ScanClientProps {
  stampName: string;
  stampImageUrl: string;
}

export default function ScanClient({ stampName, stampImageUrl }: ScanClientProps) {
  const [userCode, setUserCode] = useState("");
  const [lastResult, setLastResult] = useState<GrantResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionGrantCount, setSessionGrantCount] = useState(0);
  const [cameraStarted, setCameraStarted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const startCamera = useCallback(async () => {
    setCameraStarted(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      // Camera not available or permission denied — fallback to manual code only
    }
  }, []);

  const handleGrant = useCallback(async () => {
    const code = userCode.trim().toUpperCase();
    if (code.length !== 6) {
      setError("Please enter a 6-character code.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/grant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userCode: code }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg = (body as { error?: string }).error ?? "Request failed";
        if (res.status === 404) setError("User not found. Check the code.");
        else setError(msg);
        return;
      }
      const result: GrantResult = await res.json();
      setLastResult(result);
      if (result.granted) {
        setSessionGrantCount((c) => c + 1);
      }
      setUserCode("");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [userCode]);

  const activeCount = lastResult?.card.activeStamps.length ?? 0;

  return (
    <div className="flex w-full max-w-sm flex-col gap-6">
      {/* Bound stamp display */}
      <div className="flex flex-col items-center gap-3 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={stampImageUrl}
          alt={stampName}
          width={80}
          height={80}
          className="rounded-lg object-cover"
        />
        <p className="text-lg font-semibold text-black dark:text-zinc-50">
          {stampName}
        </p>
        <p className="text-sm text-zinc-500">This is the stamp you grant.</p>
      </div>

      {/* Camera */}
      {!cameraStarted ? (
        <button
          onClick={startCamera}
          className="rounded-lg bg-zinc-900 px-6 py-3 font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-black"
        >
          Start Camera
        </button>
      ) : (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full rounded-xl"
          aria-label="Camera viewfinder"
        />
      )}

      {/* Manual code entry */}
      <div className="flex flex-col gap-3">
        <label
          htmlFor="user-code"
          className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Or enter 6-character code manually
        </label>
        <input
          id="user-code"
          type="text"
          maxLength={6}
          value={userCode}
          onChange={(e) => setUserCode(e.target.value.toUpperCase())}
          placeholder="ABC123"
          className="rounded-lg border border-zinc-300 bg-white px-4 py-3 font-mono text-lg uppercase tracking-widest text-black placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
        <button
          onClick={handleGrant}
          disabled={loading || userCode.trim().length !== 6}
          className="rounded-lg bg-zinc-900 px-6 py-3 font-medium text-white disabled:opacity-50 hover:bg-zinc-700 dark:bg-zinc-50 dark:text-black"
        >
          {loading ? "Granting…" : "Grant Stamp"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
          {error}
        </p>
      )}

      {/* Last result */}
      {lastResult && (
        <div
          className={`rounded-xl border px-4 py-4 ${
            lastResult.alreadyHad
              ? "border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20"
              : "border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/20"
          }`}
        >
          {lastResult.alreadyHad ? (
            <p className="font-medium text-amber-700 dark:text-amber-400">
              Already had this stamp
            </p>
          ) : (
            <>
              <p className="font-medium text-green-700 dark:text-green-400">
                Granted ✓
              </p>
              <p className="text-sm text-green-600 dark:text-green-500">
                {activeCount}/{5} stamps collected
                {lastResult.card.bonusCount > 0 &&
                  ` (+${lastResult.card.bonusCount} bonus)`}
              </p>
              {lastResult.completionCaptured && (
                <p className="mt-1 text-sm font-semibold text-green-700 dark:text-green-300">
                  🎉 Completion earned!
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* Running tally */}
      <p className="text-center text-sm text-zinc-500">
        You&apos;ve granted <span className="font-semibold text-black dark:text-zinc-50">{sessionGrantCount}</span> stamp
        {sessionGrantCount !== 1 ? "s" : ""} this session.
      </p>
    </div>
  );
}
