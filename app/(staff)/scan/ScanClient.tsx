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
    <div className="flex w-full max-w-sm flex-col gap-6 bg-[var(--color-bg)]">
      {/* Bound stamp display */}
      <div className="flex flex-col items-center gap-3 border-brutal shadow-hard bg-white p-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={stampImageUrl}
          alt={stampName}
          width={80}
          height={80}
          className="object-cover"
        />
        <p className="text-lg font-bold text-black">
          {stampName}
        </p>
        <p className="text-sm text-zinc-600">This is the stamp you grant.</p>
      </div>

      {/* Camera */}
      {!cameraStarted ? (
        <button
          onClick={startCamera}
          className="border-brutal shadow-hard bg-zinc-900 px-6 py-3 font-bold text-white min-h-[48px]"
        >
          Start Camera
        </button>
      ) : (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full border-brutal"
          aria-label="Camera viewfinder"
        />
      )}

      {/* Or divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 border-t-2 border-black" />
        <span className="text-sm font-bold text-black uppercase">or</span>
        <div className="flex-1 border-t-2 border-black" />
      </div>

      {/* Manual code entry */}
      <div className="flex flex-col gap-3">
        <label
          htmlFor="user-code"
          className="text-sm font-bold text-black uppercase tracking-wide"
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
          className="border-brutal shadow-hard bg-white px-4 font-mono text-xl uppercase tracking-widest text-black placeholder-zinc-400 focus:outline-none w-full min-h-[48px]"
        />
        <button
          onClick={handleGrant}
          disabled={loading || userCode.trim().length !== 6}
          className="border-brutal shadow-hard bg-[var(--color-primary)] px-6 font-bold text-white disabled:opacity-50 min-h-[48px] w-full"
        >
          {loading ? "Granting…" : "Grant Stamp"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <p className="border-brutal bg-red-100 px-4 py-3 text-sm font-bold text-red-700">
          {error}
        </p>
      )}

      {/* Last result */}
      {lastResult && (
        <div
          data-testid="result-card"
          className={`border-brutal shadow-hard px-4 py-4 ${
            lastResult.alreadyHad
              ? "bg-orange-100 border-orange-500"
              : "bg-[#CCFF66]"
          }`}
        >
          {lastResult.alreadyHad ? (
            <p className="font-bold text-orange-800 text-lg">
              Already had this stamp
            </p>
          ) : (
            <>
              <p className="font-bold text-black text-xl">
                Granted ✓
              </p>
              <p className="text-sm font-medium text-zinc-700">
                {activeCount}/{5} stamps collected
                {lastResult.card.bonusCount > 0 &&
                  ` (+${lastResult.card.bonusCount} bonus)`}
              </p>
              {lastResult.completionCaptured && (
                <p className="mt-1 text-sm font-bold text-black">
                  🎉 Completion earned!
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* Running tally */}
      <p className="text-center text-sm font-medium text-zinc-600">
        You&apos;ve granted <span className="font-bold text-black">{sessionGrantCount}</span> stamp
        {sessionGrantCount !== 1 ? "s" : ""} this session.
      </p>
    </div>
  );
}
