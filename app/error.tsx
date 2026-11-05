"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  RotateCcw,
  RefreshCw,
  AlertTriangle,
  Home,
  CheckCircle2,
} from "lucide-react";
import { useAudioStore, reloadAudioSingleton } from "@/stores/useAudioStore";

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorBoundary({ error, reset }: ErrorBoundaryProps) {
  const [isReloadingPlayer, setIsReloadingPlayer] = useState(false);
  const [playerReloaded, setPlayerReloaded] = useState(false);
  const restartAudio = useAudioStore((state) => state.restartAudio);

  useEffect(() => {
    // Log runtime exception for observability
    console.error("[BeatSync Runtime Error]", error);
  }, [error]);

  const handleReloadPlayer = () => {
    setIsReloadingPlayer(true);
    try {
      if (typeof restartAudio === "function") {
        restartAudio();
      } else {
        reloadAudioSingleton();
      }
      setPlayerReloaded(true);
      setTimeout(() => setPlayerReloaded(false), 2500);
    } catch (err) {
      console.warn("[BeatSync] Failed to reload audio player:", err);
    } finally {
      setIsReloadingPlayer(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-full px-4 sm:px-6 py-12 sm:py-16 bg-[var(--bg-surface)] select-none text-center animate-in fade-in duration-300 max-w-full overflow-hidden">
      {/* Visual Alert Icon Container */}
      <div className="relative flex items-center justify-center mb-6 sm:mb-8">
        <div
          className="relative flex h-24 w-24 sm:h-28 sm:w-28 items-center justify-center bg-[var(--bg-surface)] shadow-sunken"
          style={{ borderRadius: "9999px" }}
        >
          <AlertTriangle className="h-12 w-12 sm:h-14 sm:w-14 text-amber-500 stroke-[1.75]" />
        </div>

        {/* Runtime Badge */}
        <span className="absolute -top-1 -right-1 rounded-full bg-[var(--bg-surface)] shadow-raised-sm px-2.5 py-0.5 text-[11px] font-mono font-bold text-amber-500">
          Runtime
        </span>
      </div>

      {/* Heading */}
      <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-[var(--text-primary)] tracking-tight px-2">
        Something Went Wrong
      </h1>

      {/* Subtext */}
      <p className="mt-2.5 sm:mt-3 text-xs sm:text-base text-[var(--text-secondary)] max-w-sm sm:max-w-lg mx-auto leading-relaxed px-4">
        A playback stream or rendering failure occurred while loading this view. You can retry the page or reset the audio engine below.
      </p>

      {/* Error Details Box */}
      <div className="mt-5 sm:mt-6 w-full max-w-sm sm:max-w-md rounded-2xl bg-[var(--bg-surface)] shadow-sunken-sm p-4 text-left">
        <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
          <span>Error Detail</span>
          {error.digest && (
            <span className="font-mono text-[10px] text-[var(--text-secondary)]">
              digest: {error.digest}
            </span>
          )}
        </div>
        <p className="font-mono text-xs text-[#E07A5F] break-words line-clamp-3">
          {error.message || "An unexpected runtime error occurred."}
        </p>
      </div>

      {/* Action Controls */}
      <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto max-w-xs sm:max-w-none">
        {/* 1. Retry Page Render Button */}
        <button
          onClick={() => reset()}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--bg-surface)] text-[var(--text-primary)] font-bold px-7 py-3 sm:py-3.5 text-sm shadow-raised-sm active:shadow-sunken-sm hover:scale-105 transition-all cursor-pointer w-full sm:w-auto"
        >
          <RefreshCw className="h-4 w-4 stroke-[2.5]" />
          <span>Retry</span>
        </button>

        {/* 2. Reload Audio Player Singleton Button */}
        <button
          onClick={handleReloadPlayer}
          disabled={isReloadingPlayer}
          className={`inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 sm:py-3.5 text-sm font-semibold transition-all cursor-pointer w-full sm:w-auto ${
            playerReloaded
              ? "bg-[var(--bg-surface)] shadow-sunken-sm text-emerald-500 font-bold"
              : "bg-[var(--bg-surface)] shadow-raised-sm active:shadow-sunken-sm text-[var(--text-primary)] hover:scale-105"
          }`}
        >
          {playerReloaded ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          ) : (
            <RotateCcw
              className={`h-4 w-4 text-[var(--text-primary)] ${
                isReloadingPlayer ? "animate-spin" : ""
              }`}
            />
          )}
          <span>{playerReloaded ? "Player Reloaded" : "Reload Player"}</span>
        </button>

        {/* 3. Back to Home */}
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--bg-surface)] shadow-raised-sm active:shadow-sunken-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium px-5 py-3 sm:py-3.5 text-sm transition-all cursor-pointer w-full sm:w-auto"
        >
          <Home className="h-4 w-4" />
          <span>Home</span>
        </Link>
      </div>
    </div>
  );
}
