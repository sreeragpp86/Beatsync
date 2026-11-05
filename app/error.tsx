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
    <div className="flex flex-col items-center justify-center min-h-full px-4 sm:px-6 py-12 sm:py-16 bg-[#121212] select-none text-center animate-in fade-in duration-300 max-w-full overflow-hidden">
      {/* Visual Alert Icon Container */}
      <div className="relative flex items-center justify-center mb-6 sm:mb-8">
        {/* Amber/Rose Ambient Halo */}
        <div className="absolute h-36 w-36 rounded-full bg-radial from-amber-500/15 via-rose-500/5 to-transparent blur-2xl pointer-events-none" />

        <div
          className="relative flex h-24 w-24 sm:h-28 sm:w-28 items-center justify-center bg-[#181822] border border-amber-500/25 shadow-[0_16px_40px_rgba(0,0,0,0.8)]"
          style={{ borderRadius: "9999px" }}
        >
          <AlertTriangle className="h-12 w-12 sm:h-14 sm:w-14 text-amber-400 stroke-[1.75]" />
        </div>

        {/* Runtime Badge */}
        <span className="absolute -top-1 -right-1 rounded-full bg-amber-500/15 backdrop-blur-md border border-amber-500/30 px-2.5 py-0.5 text-[11px] font-mono font-bold text-amber-400 shadow-md">
          Runtime
        </span>
      </div>

      {/* Heading */}
      <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight drop-shadow-sm px-2">
        Something Went Wrong
      </h1>

      {/* Subtext */}
      <p className="mt-2.5 sm:mt-3 text-xs sm:text-base text-[#B3B3B3] max-w-sm sm:max-w-lg mx-auto leading-relaxed px-4">
        A playback stream or rendering failure occurred while loading this view. You can retry the page or reset the audio engine below.
      </p>

      {/* Error Details Box */}
      <div className="mt-5 sm:mt-6 w-full max-w-sm sm:max-w-md rounded-xl bg-white/[0.04] border border-white/10 p-3.5 sm:p-4 text-left shadow-inner">
        <div className="flex items-center justify-between text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider mb-1.5">
          <span>Error Detail</span>
          {error.digest && (
            <span className="font-mono text-[10px] text-[#71717A]">
              digest: {error.digest}
            </span>
          )}
        </div>
        <p className="font-mono text-xs text-rose-300 break-words line-clamp-3">
          {error.message || "An unexpected runtime error occurred."}
        </p>
      </div>

      {/* Action Controls - Stacked on mobile, row on tablet/desktop */}
      <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto max-w-xs sm:max-w-none">
        {/* 1. Retry Page Render Button */}
        <button
          onClick={() => reset()}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold px-7 py-3 sm:py-3.5 text-sm transition-all duration-200 hover:scale-105 active:scale-95 shadow-xl shadow-[#1DB954]/25 cursor-pointer w-full sm:w-auto"
        >
          <RefreshCw className="h-4 w-4 stroke-[2.5]" />
          <span>Retry</span>
        </button>

        {/* 2. Reload Audio Player Singleton Button */}
        <button
          onClick={handleReloadPlayer}
          disabled={isReloadingPlayer}
          className={`inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 sm:py-3.5 text-sm font-semibold border transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer w-full sm:w-auto ${
            playerReloaded
              ? "bg-[#1DB954]/20 border-[#1DB954]/40 text-[#1DB954]"
              : "bg-white/5 hover:bg-white/10 text-white border-white/10"
          }`}
        >
          {playerReloaded ? (
            <CheckCircle2 className="h-4 w-4 text-[#1DB954]" />
          ) : (
            <RotateCcw
              className={`h-4 w-4 text-white ${
                isReloadingPlayer ? "animate-spin" : ""
              }`}
            />
          )}
          <span>{playerReloaded ? "Player Reloaded" : "Reload Player"}</span>
        </button>

        {/* 3. Back to Home */}
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-transparent hover:bg-white/5 text-[#A1A1AA] hover:text-white font-medium px-5 py-3 sm:py-3.5 text-sm transition-colors cursor-pointer w-full sm:w-auto"
        >
          <Home className="h-4 w-4" />
          <span>Home</span>
        </Link>
      </div>
    </div>
  );
}
