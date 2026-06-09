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
      {/* Bound stamp display — the stamp this booth hands out. */}
      <div className="flex flex-col items-center gap-3 border-brutal bg-white p-6 shadow-hard">
        <div className="flex h-24 w-24 items-center justify-center overflow-hidden border-[3px] border-black bg-[var(--color-bg)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={stampImageUrl}
            alt={stampName}
            width={80}
            height={80}
            className="h-20 w-20 object-contain"
          />
        </div>
        <p className="font-display text-xl uppercase text-black">{stampName}</p>
        <p className="text-xs font-bold uppercase tracking-widest text-black/50">
          The stamp you grant
        </p>
      </div>

      {/* Camera */}
      {!cameraStarted ? (
        <button
          onClick={startCamera}
          className="btn-press border-brutal shadow-hard bg-black px-6 py-3 font-bold uppercase tracking-wide text-white min-h-[48px]"
        >
          Start camera
        </button>
      ) : (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full border-brutal shadow-hard"
          aria-label="Camera viewfinder"
        />
      )}

      {/* Or divider */}
      <div className="flex items-center gap-3">
        <div className="h-1 flex-1 bg-black" />
        <span className="text-xs font-bold uppercase tracking-widest text-black">or</span>
        <div className="h-1 flex-1 bg-black" />
      </div>

      {/* Manual code entry */}
      <div className="flex flex-col gap-3">
        <label
          htmlFor="user-code"
          className="text-xs font-bold text-black uppercase tracking-widest"
        >
          Enter 6-character code
        </label>
        <input
          id="user-code"
          type="text"
          maxLength={6}
          value={userCode}
          onChange={(e) => setUserCode(e.target.value.toUpperCase())}
          placeholder="ABC123"
          className="border-brutal shadow-hard bg-white px-4 py-3 text-center font-mono text-2xl uppercase tracking-[0.4em] text-black placeholder-zinc-300 focus:outline-none focus:-translate-y-0.5 focus:shadow-hard-lg transition-all w-full min-h-[48px]"
        />
        <button
          onClick={handleGrant}
          disabled={loading || userCode.trim().length !== 6}
          className="btn-press border-brutal shadow-hard bg-[var(--color-primary)] px-6 font-display text-lg uppercase tracking-wide text-white disabled:opacity-50 min-h-[48px] w-full"
        >
          {loading ? "Granting…" : "Grant stamp"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <p className="border-brutal bg-[var(--color-danger)] px-4 py-3 text-sm font-bold text-white">
          {error}
        </p>
      )}

      {/* Last result */}
      {lastResult && (
        <div
          data-testid="result-card"
          className={`border-brutal shadow-hard px-5 py-4 ${
            lastResult.alreadyHad
              ? "bg-[var(--color-accent)]"
              : "bg-[var(--color-lime)]"
          }`}
        >
          {lastResult.alreadyHad ? (
            <p className="font-display text-xl uppercase text-black">
              Already had this stamp
            </p>
          ) : (
            <>
              <p className="font-display text-2xl uppercase text-black">
                Granted ✓
              </p>
              <p className="mt-1 text-sm font-bold text-black/70">
                {activeCount}/{5} stamps collected
                {lastResult.card.bonusCount > 0 &&
                  ` (+${lastResult.card.bonusCount} bonus)`}
              </p>
              {lastResult.completionCaptured && (
                <p className="mt-2 inline-block border-[3px] border-black bg-[var(--color-pink)] px-2 py-0.5 text-sm font-bold uppercase text-white">
                  🎉 Completion earned!
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* Running tally */}
      <p className="text-center text-sm font-bold uppercase tracking-wide text-black/60">
        Granted <span className="text-black">{sessionGrantCount}</span> stamp
        {sessionGrantCount !== 1 ? "s" : ""} this session
      </p>
    </div>
  );
}
