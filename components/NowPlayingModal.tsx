"use client";

import { useState, useEffect, useRef, useId } from "react";
import Image from "next/image";
import {
  ChevronDown,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  Volume1,
  VolumeX,
  Music2,
  ListMusic,
  Share2,
  Loader2,
  Sparkles,
  Mic2,
  Disc3,
} from "lucide-react";
import { useAudioStore } from "@/stores/useAudioStore";
import { LikeButton } from "@/components/LikeButton";
import { toast } from "sonner";

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function NowPlayingModal() {
  const {
    currentTrack,
    isPlaying,
    isLoadingStream,
    currentTime,
    duration,
    volume,
    queue,
    queueIndex,
    isNowPlayingOpen,
    isShuffle,
    repeatMode,
    closeNowPlaying,
    togglePlay,
    seek,
    setVolume,
    toggleMute,
    playNext,
    playPrevious,
    toggleShuffle,
    toggleRepeat,
    toggleQueue,
  } = useAudioStore();

  const [activeTab, setActiveTab] = useState<"song" | "lyrics">("song");
  const [isDragging, setIsDragging] = useState(false);
  const [dragTime, setDragTime] = useState(0);
  const dragTimeRef = useRef<number>(0);
  const prevVolumeRef = useRef<number>(volume > 0 ? volume : 0.8);

  const timelineSliderId = useId();
  const volumeSliderId = useId();

  // Keep drag time ref updated
  useEffect(() => {
    dragTimeRef.current = dragTime;
  }, [dragTime]);

  // Keep volume ref updated
  useEffect(() => {
    if (volume > 0) {
      prevVolumeRef.current = volume;
    }
  }, [volume]);

  // Escape key handler to close modal
  useEffect(() => {
    if (!isNowPlayingOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeNowPlaying();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isNowPlayingOpen, closeNowPlaying]);

  // Lock body scroll while modal is active
  useEffect(() => {
    if (isNowPlayingOpen) {
      document.body.classList.add("overflow-hidden");
    } else {
      document.body.classList.remove("overflow-hidden");
    }
    return () => {
      document.body.classList.remove("overflow-hidden");
    };
  }, [isNowPlayingOpen]);

  // Global pointer up for seeking
  useEffect(() => {
    if (!isDragging) return;

    const handleGlobalPointerUp = () => {
      seek(dragTimeRef.current);
      setIsDragging(false);
    };

    window.addEventListener("pointerup", handleGlobalPointerUp);
    window.addEventListener("touchend", handleGlobalPointerUp);

    return () => {
      window.removeEventListener("pointerup", handleGlobalPointerUp);
      window.removeEventListener("touchend", handleGlobalPointerUp);
    };
  }, [isDragging, seek]);

  if (!isNowPlayingOpen || !currentTrack) {
    return null;
  }

  const totalDuration = duration > 0 ? duration : currentTrack?.duration ?? 0;
  const displayTime = isDragging ? dragTime : currentTime;
  const progressPercent = totalDuration > 0 ? (displayTime / totalDuration) * 100 : 0;
  const clampedProgress = Math.min(100, Math.max(0, progressPercent));
  const volumePercent = Math.min(100, Math.max(0, volume * 100));

  const handleSeekPointerDown = (e: React.PointerEvent<HTMLInputElement>) => {
    if (!currentTrack || totalDuration <= 0) return;
    setIsDragging(true);
    setDragTime(parseFloat(e.currentTarget.value));
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDragTime(parseFloat(e.target.value));
  };

  const handleToggleMute = () => {
    if (volume > 0) {
      prevVolumeRef.current = volume;
      toggleMute();
    } else {
      setVolume(prevVolumeRef.current > 0 ? prevVolumeRef.current : 0.8);
    }
  };

  const handleShare = async () => {
    if (!currentTrack) return;
    const shareText = `Listening to "${currentTrack.title}" by ${currentTrack.artist} on BeatSync`;
    const shareUrl = typeof window !== "undefined" ? window.location.href : "https://beatsync.vercel.app";

    if (navigator.share) {
      try {
        await navigator.share({
          title: currentTrack.title,
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch {
        // Fallback to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      toast.success("Track link copied to clipboard!");
    } catch {
      toast.info(`Now playing: ${currentTrack.title} — ${currentTrack.artist}`);
    }
  };

  const nextTrack = queueIndex >= 0 && queueIndex < queue.length - 1 ? queue[queueIndex + 1] : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Now Playing Fullscreen Overlay"
      className="fixed inset-0 z-50 bg-gradient-to-b from-zinc-900 via-[#0a0a12] to-black backdrop-blur-2xl text-white flex flex-col justify-between p-5 sm:p-8 md:p-12 overflow-y-auto animate-in fade-in slide-in-from-bottom-8 duration-300 select-none"
    >
      {/* Dynamic Ambient Background Glow from Album Artwork */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10" aria-hidden="true">
        {currentTrack.cover_url ? (
          <div className="relative w-full h-full opacity-25 blur-3xl scale-125">
            <Image
              src={currentTrack.cover_url}
              alt=""
              fill
              className="object-cover"
              priority
            />
          </div>
        ) : (
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-[#1DB954]/20 via-purple-600/15 to-transparent rounded-full blur-3xl" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/70 to-black/95" />
      </div>

      {/* =========================================================================
          1. HEADER BAR
          ========================================================================= */}
      <header className="flex items-center justify-between gap-4 w-full max-w-4xl mx-auto shrink-0">
        {/* Collapse Button */}
        <button
          onClick={closeNowPlaying}
          aria-label="Collapse Now Playing"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 text-zinc-300 hover:text-white transition-all cursor-pointer shadow-lg"
          title="Close (Esc)"
        >
          <ChevronDown className="h-6 w-6" />
        </button>

        {/* Center Source Label / Tab Switcher */}
        <div className="flex flex-col items-center min-w-0">
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-zinc-400 truncate">
            {currentTrack.album ? `PLAYING FROM ${currentTrack.album}` : "PLAYING FROM BEATSYNC"}
          </span>

          <div className="flex items-center gap-1.5 mt-1.5 p-0.5 rounded-full bg-white/10 border border-white/10 backdrop-blur-md">
            <button
              onClick={() => setActiveTab("song")}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                activeTab === "song"
                  ? "bg-white text-black shadow"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Song
            </button>
            <button
              onClick={() => setActiveTab("lyrics")}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1 cursor-pointer ${
                activeTab === "lyrics"
                  ? "bg-white text-black shadow"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Mic2 className="h-3 w-3" />
              Lyrics
            </button>
          </div>
        </div>

        {/* Right Actions: Share / Options */}
        <button
          onClick={handleShare}
          aria-label="Share song"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 text-zinc-300 hover:text-white transition-all cursor-pointer shadow-lg"
          title="Share song"
        >
          <Share2 className="h-5 w-5" />
        </button>
      </header>

      {/* =========================================================================
          2. MAIN STAGE (Track Showcase / Artwork / Lyrics)
          ========================================================================= */}
      <main className="flex-1 flex flex-col items-center justify-center my-6 md:my-8 w-full max-w-xl mx-auto">
        {activeTab === "song" ? (
          <div className="flex flex-col items-center w-full animate-in fade-in zoom-in-95 duration-200">
            {/* Square Album Cover with Ambient Backlight */}
            <div className="relative w-full max-w-[280px] sm:max-w-[340px] md:max-w-[380px] aspect-square rounded-2xl md:rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.85)] group">
              {/* Diffuse Backlight Glow */}
              <div
                className="absolute inset-0 scale-95 blur-2xl opacity-60 rounded-3xl -z-10 transition-all duration-700 group-hover:scale-100 group-hover:opacity-80"
                style={{
                  background: "radial-gradient(circle, rgba(29, 185, 84, 0.4) 0%, rgba(124, 58, 237, 0.3) 100%)",
                }}
              />

              <div className="relative w-full h-full rounded-2xl md:rounded-3xl overflow-hidden border border-white/15 bg-zinc-900">
                {currentTrack.cover_url ? (
                  <Image
                    src={currentTrack.cover_url}
                    alt={currentTrack.title || "Track Cover Art"}
                    fill
                    sizes="(max-width: 768px) 340px, 380px"
                    className="object-cover"
                    priority
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-zinc-600 bg-zinc-900">
                    <Music2 className="h-20 w-20" />
                  </div>
                )}

                {/* Subtle Vinyl Record Icon Overlay in bottom-right */}
                <div className="absolute bottom-3 right-3 p-2 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white/80">
                  <Disc3 className={`h-4 w-4 ${isPlaying ? "animate-spin" : ""}`} style={{ animationDuration: "6s" }} />
                </div>
              </div>
            </div>

            {/* Track Metadata (Title, Artist, Like Button) */}
            <div className="flex items-center justify-between w-full max-w-[380px] mt-6 sm:mt-8 gap-4 px-1">
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight truncate">
                  {currentTrack.title}
                </h1>
                <p className="text-zinc-400 text-base sm:text-lg hover:text-white hover:underline cursor-pointer truncate mt-1">
                  {currentTrack.artist}
                  {currentTrack.album ? ` • ${currentTrack.album}` : ""}
                </p>
              </div>

              <div className="shrink-0 flex items-center">
                <LikeButton
                  track={currentTrack}
                  trackId={currentTrack.id}
                  size={28}
                  className="p-1 hover:scale-110 active:scale-95 transition-transform"
                />
              </div>
            </div>
          </div>
        ) : (
          /* Lyrics View Screen */
          <div className="w-full max-w-[480px] h-[340px] md:h-[400px] overflow-y-auto px-4 py-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl flex flex-col items-center justify-center text-center space-y-4 animate-in fade-in duration-200">
            <Sparkles className="h-8 w-8 text-[#1DB954] animate-pulse" />
            <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
              {currentTrack.title}
            </h2>
            <p className="text-sm text-zinc-400">By {currentTrack.artist}</p>
            <div className="pt-4 space-y-3 text-zinc-300 font-medium text-base sm:text-lg max-w-sm">
              <p className="text-white font-bold text-xl text-[#1DB954]">
                ♪ Stream audio in high-fidelity on BeatSync ♪
              </p>
              <p className="opacity-80">Feel the rhythm and bass sync with every beat.</p>
              <p className="opacity-60 text-sm">Full time-synchronized lyrics support arriving soon.</p>
            </div>
          </div>
        )}
      </main>

      {/* =========================================================================
          3. AUDIO CONTROLS & TIMELINE SCRUBBER
          ========================================================================= */}
      <footer className="w-full max-w-xl mx-auto flex flex-col gap-5 shrink-0">
        {/* Timeline Scrubber */}
        <div className="w-full flex flex-col gap-1.5">
          <div className="relative flex items-center group">
            <label htmlFor={timelineSliderId} className="sr-only">
              Seek timeline
            </label>
            <input
              id={timelineSliderId}
              type="range"
              min="0"
              max={totalDuration > 0 ? totalDuration : 100}
              step="0.1"
              value={totalDuration > 0 ? displayTime : 0}
              disabled={!currentTrack || totalDuration <= 0}
              onPointerDown={handleSeekPointerDown}
              onChange={handleSeekChange}
              style={{
                background: `linear-gradient(to right, #1DB954 ${clampedProgress}%, rgba(255,255,255,0.2) ${clampedProgress}%)`,
              }}
              className="w-full h-1.5 md:h-2 appearance-none rounded-full cursor-pointer accent-[#1DB954] transition-all disabled:opacity-40"
            />
          </div>

          <div className="flex items-center justify-between text-xs font-mono text-zinc-400 tabular-nums px-0.5">
            <span>{formatTime(displayTime)}</span>
            <span>{formatTime(totalDuration)}</span>
          </div>
        </div>

        {/* Primary Playback Action Controls */}
        <div className="flex items-center justify-between px-2 sm:px-6">
          {/* Shuffle Toggle */}
          <button
            onClick={toggleShuffle}
            aria-label={isShuffle ? "Disable shuffle" : "Enable shuffle"}
            className={`p-2 rounded-full transition-all cursor-pointer relative ${
              isShuffle ? "text-[#1DB954]" : "text-zinc-400 hover:text-white"
            }`}
            title={isShuffle ? "Shuffle On" : "Shuffle Off"}
          >
            <Shuffle className="h-5 w-5" />
            {isShuffle && (
              <span className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-[#1DB954]" />
            )}
          </button>

          {/* Previous Track */}
          <button
            onClick={playPrevious}
            aria-label="Previous song"
            className="p-2.5 text-zinc-300 hover:text-white active:scale-90 transition-all cursor-pointer"
          >
            <SkipBack className="h-7 w-7 fill-current" />
          </button>

          {/* Large Circular Play/Pause Toggle (64px) */}
          <button
            onClick={togglePlay}
            disabled={isLoadingStream}
            aria-label={isLoadingStream ? "Loading stream..." : isPlaying ? "Pause" : "Play"}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-black shadow-2xl hover:scale-105 active:scale-95 transition-transform cursor-pointer"
          >
            {isLoadingStream ? (
              <Loader2 className="h-7 w-7 animate-spin text-black" />
            ) : isPlaying ? (
              <Pause className="h-7 w-7 fill-black" />
            ) : (
              <Play className="h-7 w-7 fill-black ml-1" />
            )}
          </button>

          {/* Next Track */}
          <button
            onClick={playNext}
            aria-label="Next song"
            className="p-2.5 text-zinc-300 hover:text-white active:scale-90 transition-all cursor-pointer"
          >
            <SkipForward className="h-7 w-7 fill-current" />
          </button>

          {/* Repeat Toggle */}
          <button
            onClick={toggleRepeat}
            aria-label={`Repeat mode: ${repeatMode}`}
            className={`p-2 rounded-full transition-all cursor-pointer relative ${
              repeatMode !== "off" ? "text-[#1DB954]" : "text-zinc-400 hover:text-white"
            }`}
            title={`Repeat: ${repeatMode}`}
          >
            {repeatMode === "one" ? (
              <Repeat1 className="h-5 w-5" />
            ) : (
              <Repeat className="h-5 w-5" />
            )}
            {repeatMode !== "off" && (
              <span className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-[#1DB954]" />
            )}
          </button>
        </div>

        {/* =========================================================================
            4. BOTTOM QUICK ACTIONS (Volume, Up Next Banner)
            ========================================================================= */}
        <div className="flex items-center justify-between pt-2 border-t border-white/10 gap-4">
          {/* Volume Control */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleMute}
              aria-label={volume === 0 ? "Unmute" : "Mute"}
              className="p-1.5 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              {volume === 0 ? (
                <VolumeX className="h-4 w-4" />
              ) : volume < 0.5 ? (
                <Volume1 className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </button>
            <div className="w-20 sm:w-28 flex items-center">
              <label htmlFor={volumeSliderId} className="sr-only">
                Volume
              </label>
              <input
                id={volumeSliderId}
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                style={{
                  background: `linear-gradient(to right, #FFFFFF ${volumePercent}%, rgba(255,255,255,0.2) ${volumePercent}%)`,
                }}
                className="w-full h-1 appearance-none rounded-full cursor-pointer accent-white hover:accent-[#1DB954] transition-all"
              />
            </div>
          </div>

          {/* Up Next Preview Banner / Queue Toggle */}
          <button
            onClick={() => {
              closeNowPlaying();
              toggleQueue();
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-zinc-300 hover:text-white transition-all cursor-pointer max-w-[220px] truncate"
            title="Open Queue"
          >
            <ListMusic className="h-3.5 w-3.5 text-[#1DB954] shrink-0" />
            <span className="truncate">
              {nextTrack ? `Up Next: ${nextTrack.title}` : "View Queue"}
            </span>
          </button>
        </div>
      </footer>
    </div>
  );
}

export default NowPlayingModal;
