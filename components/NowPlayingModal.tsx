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
import { useDynamicQueueStore } from "@/stores/useDynamicQueueStore";
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

  const { userQueue, dynamicPool } = useDynamicQueueStore();

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

  const nextTrack =
    userQueue[0] ||
    dynamicPool[0] ||
    (queueIndex >= 0 && queueIndex < queue.length - 1 ? queue[queueIndex + 1] : null);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Now Playing Fullscreen Overlay"
      className="fixed inset-0 z-50 bg-[var(--bg-surface)] text-[var(--text-primary)] transition-colors duration-200 flex flex-col justify-between p-5 sm:p-8 md:p-12 overflow-y-auto animate-in fade-in slide-in-from-bottom-8 duration-300 select-none"
    >
      {/* =========================================================================
          1. HEADER BAR
          ========================================================================= */}
      <header className="flex items-center justify-between gap-4 w-full max-w-4xl mx-auto shrink-0">
        {/* Collapse Button */}
        <button
          onClick={closeNowPlaying}
          aria-label="Collapse Now Playing"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--bg-surface)] shadow-raised-sm active:shadow-sunken-sm text-[var(--text-primary)] hover:scale-105 transition-all cursor-pointer"
          title="Close (Esc)"
        >
          <ChevronDown className="h-6 w-6" />
        </button>

        {/* Center Source Label / Tab Switcher */}
        <div className="flex flex-col items-center min-w-0">
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)] truncate">
            {currentTrack.album ? `PLAYING FROM ${currentTrack.album}` : "PLAYING FROM BEATSYNC"}
          </span>

          <div className="flex items-center gap-1.5 mt-2 p-1 rounded-full bg-[var(--bg-surface)] shadow-sunken-sm">
            <button
              onClick={() => setActiveTab("song")}
              className={`px-3.5 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                activeTab === "song"
                  ? "bg-[var(--bg-surface)] shadow-raised-sm text-[var(--text-primary)] font-bold"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              Song
            </button>
            <button
              onClick={() => setActiveTab("lyrics")}
              className={`px-3.5 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1 cursor-pointer ${
                activeTab === "lyrics"
                  ? "bg-[var(--bg-surface)] shadow-raised-sm text-[var(--text-primary)] font-bold"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              <Mic2 className="h-3 w-3" />
              Lyrics
            </button>
          </div>
        </div>

        {/* Right Actions: Share */}
        <button
          onClick={handleShare}
          aria-label="Share song"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--bg-surface)] shadow-raised-sm active:shadow-sunken-sm text-[var(--text-primary)] hover:scale-105 transition-all cursor-pointer"
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
            {/* Square Album Cover with Tactile Neomorphic Frame */}
            <div className="relative w-full max-w-[280px] sm:max-w-[340px] md:max-w-[380px] aspect-square rounded-3xl bg-[var(--bg-surface)] shadow-raised p-3 group">
              <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-sunken-sm bg-[var(--bg-surface)]">
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
                  <div className="flex h-full w-full items-center justify-center text-[var(--text-secondary)]">
                    <Music2 className="h-20 w-20" />
                  </div>
                )}

                {/* Subtle Vinyl Record Icon Overlay */}
                <div className="absolute bottom-3 right-3 p-2 rounded-full bg-[var(--bg-surface)]/80 shadow-raised-sm text-[var(--text-primary)]">
                  <Disc3 className={`h-4 w-4 ${isPlaying ? "animate-spin" : ""}`} style={{ animationDuration: "6s" }} />
                </div>
              </div>
            </div>

            {/* Track Metadata (Title, Artist, Like Button) */}
            <div className="flex items-center justify-between w-full max-w-[380px] mt-6 sm:mt-8 gap-4 px-1">
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight truncate">
                  {currentTrack.title}
                </h1>
                <p className="text-[var(--text-secondary)] text-base sm:text-lg hover:text-[var(--text-primary)] hover:underline cursor-pointer truncate mt-1">
                  {currentTrack.artist}
                  {currentTrack.album ? ` • ${currentTrack.album}` : ""}
                </p>
              </div>

              <div className="shrink-0 flex items-center">
                <LikeButton
                  track={currentTrack}
                  trackId={currentTrack.id}
                  size={26}
                  className="p-1 hover:scale-105 active:scale-95 transition-transform"
                />
              </div>
            </div>
          </div>
        ) : (
          /* Lyrics View Screen */
          <div className="w-full max-w-[480px] h-[340px] md:h-[400px] overflow-y-auto px-6 py-8 rounded-3xl bg-[var(--bg-surface)] shadow-sunken-sm flex flex-col items-center justify-center text-center space-y-4 animate-in fade-in duration-200">
            <Sparkles className="h-8 w-8 text-[#E07A5F]" />
            <h2 className="text-xl md:text-2xl font-bold text-[var(--text-primary)] tracking-tight">
              {currentTrack.title}
            </h2>
            <p className="text-sm text-[var(--text-secondary)]">By {currentTrack.artist}</p>
            <div className="pt-4 space-y-3 text-[var(--text-secondary)] font-medium text-base sm:text-lg max-w-sm">
              <p className="text-[var(--text-primary)] font-bold text-xl">
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
          <div className="relative flex items-center">
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
              className="neo-slider w-full cursor-pointer disabled:opacity-40"
            />
          </div>

          <div className="flex items-center justify-between text-xs font-mono text-[var(--text-secondary)] tabular-nums px-0.5">
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
            className={`p-2.5 rounded-full bg-[var(--bg-surface)] transition-all cursor-pointer ${
              isShuffle
                ? "shadow-sunken-sm text-[var(--text-primary)]"
                : "shadow-raised-sm active:shadow-sunken-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
            title={isShuffle ? "Shuffle On" : "Shuffle Off"}
          >
            <Shuffle className="h-5 w-5" />
          </button>

          {/* Previous Track */}
          <button
            onClick={playPrevious}
            aria-label="Previous song"
            className="p-3 rounded-full bg-[var(--bg-surface)] shadow-raised-sm active:shadow-sunken-sm text-[var(--text-primary)] hover:scale-105 transition-all cursor-pointer"
          >
            <SkipBack className="h-6 w-6 fill-current" />
          </button>

          {/* Large Circular Play/Pause Toggle (64px) */}
          <button
            onClick={togglePlay}
            disabled={isLoadingStream}
            aria-label={isLoadingStream ? "Loading stream..." : isPlaying ? "Pause" : "Play"}
            className={`flex h-16 w-16 items-center justify-center rounded-full bg-[var(--bg-surface)] text-[var(--text-primary)] transition-all cursor-pointer ${
              isPlaying
                ? "shadow-sunken"
                : "shadow-raised hover:scale-105 active:shadow-sunken"
            }`}
          >
            {isLoadingStream ? (
              <Loader2 className="h-7 w-7 animate-spin text-[var(--text-primary)]" />
            ) : isPlaying ? (
              <Pause className="h-7 w-7 fill-current" />
            ) : (
              <Play className="h-7 w-7 fill-current ml-1" />
            )}
          </button>

          {/* Next Track */}
          <button
            onClick={playNext}
            aria-label="Next song"
            className="p-3 rounded-full bg-[var(--bg-surface)] shadow-raised-sm active:shadow-sunken-sm text-[var(--text-primary)] hover:scale-105 transition-all cursor-pointer"
          >
            <SkipForward className="h-6 w-6 fill-current" />
          </button>

          {/* Repeat Toggle */}
          <button
            onClick={toggleRepeat}
            aria-label={`Repeat mode: ${repeatMode}`}
            className={`p-2.5 rounded-full bg-[var(--bg-surface)] transition-all cursor-pointer ${
              repeatMode !== "off"
                ? "shadow-sunken-sm text-[var(--text-primary)]"
                : "shadow-raised-sm active:shadow-sunken-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
            title={`Repeat: ${repeatMode}`}
          >
            {repeatMode === "one" ? (
              <Repeat1 className="h-5 w-5" />
            ) : (
              <Repeat className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* =========================================================================
            4. BOTTOM QUICK ACTIONS (Volume, Up Next Banner)
            ========================================================================= */}
        <div className="flex items-center justify-between pt-3 gap-4">
          {/* Volume Control */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleMute}
              aria-label={volume === 0 ? "Unmute" : "Mute"}
              className="p-2 rounded-full bg-[var(--bg-surface)] shadow-raised-sm active:shadow-sunken-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
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
                className="neo-slider w-full cursor-pointer"
              />
            </div>
          </div>

          {/* Up Next Preview Banner / Queue Toggle */}
          <button
            onClick={() => {
              closeNowPlaying();
              toggleQueue();
            }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-[var(--bg-surface)] shadow-raised-sm active:shadow-sunken-sm text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer max-w-[220px] truncate"
            title="Open Queue"
          >
            <ListMusic className="h-3.5 w-3.5 text-[#E07A5F] shrink-0" />
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
