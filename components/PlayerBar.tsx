"use client";

import { useState, useEffect, useRef, useId } from "react";
import Image from "next/image";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  Volume1,
  VolumeX,
  Music2,
  ListMusic,
  Loader2,
  Maximize2,
  ChevronUp,
} from "lucide-react";
import { useAudioStore } from "@/stores/useAudioStore";
import { QueueDrawer } from "@/components/QueueDrawer";
import { LikeButton } from "@/components/LikeButton";
import { Toast } from "@/components/Toast";

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function PlayerBar() {
  const {
    currentTrack,
    isPlaying,
    isLoadingStream,
    currentTime,
    duration,
    volume,
    togglePlay,
    seek,
    setVolume,
    toggleMute,
    playNext,
    playPrevious,
    toggleQueue,
    isQueueOpen,
    openNowPlaying,
  } = useAudioStore();

  const [isDragging, setIsDragging] = useState(false);
  const [dragTime, setDragTime] = useState(0);
  const prevVolumeRef = useRef<number>(volume > 0 ? volume : 0.8);
  const dragTimeRef = useRef<number>(0);

  const timelineSliderId = useId();
  const volumeSliderId = useId();

  useEffect(() => {
    dragTimeRef.current = dragTime;
  }, [dragTime]);

  useEffect(() => {
    if (volume > 0) {
      prevVolumeRef.current = volume;
    }
  }, [volume]);

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

  const totalDuration = duration > 0 ? duration : currentTrack?.duration ?? 0;
  const displayTime = isDragging ? dragTime : currentTime;
  const progressPercent = totalDuration > 0 ? (displayTime / totalDuration) * 100 : 0;
  const clampedProgress = Math.min(100, Math.max(0, progressPercent));

  const handleSeekPointerDown = (e: React.PointerEvent<HTMLInputElement>) => {
    if (!currentTrack || totalDuration <= 0) return;
    setIsDragging(true);
    setDragTime(parseFloat(e.currentTarget.value));
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDragTime(parseFloat(e.target.value));
  };

  const handleSeekKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      seek(parseFloat(e.currentTarget.value));
    }
  };

  const handleToggleMute = () => {
    if (volume > 0) {
      prevVolumeRef.current = volume;
      toggleMute();
    } else {
      setVolume(prevVolumeRef.current > 0 ? prevVolumeRef.current : 0.8);
    }
  };

  const renderVolumeIcon = () => {
    if (volume === 0) {
      return <VolumeX className="h-4 w-4" />;
    }
    if (volume < 0.5) {
      return <Volume1 className="h-4 w-4" />;
    }
    return <Volume2 className="h-4 w-4" />;
  };

  return (
    <>
      {/* =========================================================================
          1. MOBILE TACTILE MINI-PLAYER (Floating above bottom navigation)
          ========================================================================= */}
      {currentTrack && (
        <div
          aria-label="Mobile Mini Player"
          className="fixed bottom-[64px] left-3 right-3 z-40 md:hidden flex flex-col rounded-2xl bg-[var(--bg-surface)] shadow-raised p-2.5 transition-colors duration-200 select-none"
        >
          <div className="flex items-center justify-between gap-2.5">
            {/* Artwork + Title & Artist */}
            <div
              onClick={openNowPlaying}
              className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
              title="Expand Now Playing"
            >
              <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-[var(--bg-surface)] shadow-raised-sm">
                {currentTrack.cover_url ? (
                  <Image
                    src={currentTrack.cover_url}
                    alt={currentTrack.title || "Track artwork"}
                    fill
                    sizes="44px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[var(--text-secondary)]">
                    <Music2 className="h-5 w-5" />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1 truncate">
                <p className="text-xs font-bold text-[var(--text-primary)] truncate">
                  {currentTrack.title}
                </p>
                <p className="text-[11px] text-[var(--text-secondary)] truncate mt-0.5">
                  {currentTrack.artist}
                </p>
              </div>
            </div>

            {/* Mobile Tactile Controls */}
            <div className="flex items-center gap-2 shrink-0">
              <LikeButton track={currentTrack} trackId={currentTrack.id} size={16} />

              {/* Play / Pause Tactile Button */}
              <button
                onClick={togglePlay}
                disabled={isLoadingStream}
                aria-label={isLoadingStream ? "Loading stream..." : isPlaying ? "Pause" : "Play"}
                className={`flex h-10 w-10 items-center justify-center rounded-full bg-[var(--bg-surface)] text-[var(--text-primary)] transition-all cursor-pointer ${
                  isPlaying ? "shadow-sunken" : "shadow-raised"
                }`}
              >
                {isLoadingStream ? (
                  <Loader2 className="h-4 w-4 animate-spin text-[var(--text-primary)]" />
                ) : isPlaying ? (
                  <Pause className="h-4 w-4 fill-current" />
                ) : (
                  <Play className="h-4 w-4 fill-current ml-0.5" />
                )}
              </button>

              <button
                onClick={playNext}
                aria-label="Next song"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] shadow-raised-sm active:shadow-sunken-sm transition-all cursor-pointer"
              >
                <SkipForward className="h-4 w-4 fill-current" />
              </button>

              <button
                onClick={openNowPlaying}
                aria-label="Expand Now Playing"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] shadow-raised-sm active:shadow-sunken-sm transition-all cursor-pointer"
                title="Expand Now Playing"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Micro Recessed Progress Groove */}
          <div className="w-full bg-[var(--bg-surface)] shadow-sunken-sm h-1.5 rounded-full overflow-hidden mt-2">
            <div
              className="bg-[var(--text-secondary)] opacity-50 h-full rounded-full transition-all duration-150"
              style={{ width: `${clampedProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* =========================================================================
          2. DESKTOP TACTILE FLOATING PLAYER DOCK (hidden md:flex)
          ========================================================================= */}
      <footer
        aria-label="Neomorphic Player Dock"
        className="hidden md:flex fixed bottom-0 left-0 right-0 h-[88px] md:mx-4 md:mb-4 rounded-2xl bg-[var(--bg-surface)] shadow-raised px-4 md:px-6 z-40 items-center justify-between select-none transition-colors duration-200"
      >
        {/* Left Section: Current Track Artwork & Metadata */}
        <div className="flex items-center gap-3.5 w-1/4 min-w-[160px] max-w-[280px]">
          <div
            onClick={openNowPlaying}
            className="group/art relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[var(--bg-surface)] shadow-raised-sm cursor-pointer"
            title="Expand Now Playing"
          >
            {currentTrack?.cover_url ? (
              <Image
                src={currentTrack.cover_url}
                alt={currentTrack.title || "Track artwork"}
                fill
                sizes="56px"
                className="object-cover group-hover/art:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[var(--text-secondary)]">
                <Music2 className="h-6 w-6" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/25 opacity-0 group-hover/art:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
              <ChevronUp className="h-5 w-5 text-white" />
            </div>
          </div>

          <div
            onClick={openNowPlaying}
            className="min-w-0 flex-1 cursor-pointer"
            title="Expand Now Playing"
          >
            {currentTrack ? (
              <>
                <p className="text-sm font-semibold text-[var(--text-primary)] truncate hover:underline">
                  {currentTrack.title}
                </p>
                <p className="text-xs text-[var(--text-secondary)] truncate hover:underline hover:text-[var(--text-primary)] mt-0.5">
                  {currentTrack.artist}
                  {currentTrack.album ? ` • ${currentTrack.album}` : ""}
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-[var(--text-secondary)] truncate">
                  No track selected
                </p>
                <p className="text-xs text-[var(--text-secondary)]/70 truncate mt-0.5">
                  Pick a song to play
                </p>
              </>
            )}
          </div>

          {currentTrack && (
            <div className="shrink-0 flex items-center gap-1">
              <LikeButton track={currentTrack} trackId={currentTrack.id} size={18} />
            </div>
          )}
        </div>

        {/* Center Section: Controls & Recessed Scrubber */}
        <div className="flex flex-col items-center gap-2 flex-1 max-w-xl px-2 sm:px-6">
          {/* Controls Buttons */}
          <div className="flex items-center gap-5">
            {/* Previous Track */}
            <button
              onClick={playPrevious}
              disabled={!currentTrack}
              aria-label="Previous song"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] shadow-raised-sm active:shadow-sunken-sm transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <SkipBack className="h-4 w-4 fill-current" />
            </button>

            {/* Large Circular Play/Pause (w-14 h-14) */}
            <button
              onClick={togglePlay}
              disabled={!currentTrack || isLoadingStream}
              aria-label={isLoadingStream ? "Loading stream..." : isPlaying ? "Pause" : "Play"}
              className={`flex h-14 w-14 items-center justify-center rounded-full bg-[var(--bg-surface)] text-[var(--text-primary)] transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                isPlaying ? "shadow-sunken" : "shadow-raised"
              }`}
            >
              {isLoadingStream ? (
                <Loader2 className="h-5 w-5 animate-spin text-[var(--text-primary)]" />
              ) : isPlaying ? (
                <Pause className="h-5 w-5 fill-current" />
              ) : (
                <Play className="h-5 w-5 fill-current ml-0.5" />
              )}
            </button>

            {/* Next Track */}
            <button
              onClick={playNext}
              disabled={!currentTrack}
              aria-label="Next song"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] shadow-raised-sm active:shadow-sunken-sm transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <SkipForward className="h-4 w-4 fill-current" />
            </button>
          </div>

          {/* Timeline Scrubber in an Indented Groove */}
          <div className="flex w-full items-center gap-3 text-[11px] font-mono text-[var(--text-secondary)]">
            <span className="w-9 text-right tabular-nums">
              {formatTime(displayTime)}
            </span>

            <div className="relative flex-1 flex items-center h-2.5 rounded-full bg-[var(--bg-surface)] shadow-sunken-sm px-0.5">
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
                onKeyUp={handleSeekKeyUp}
                className="neo-slider w-full cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              />
            </div>

            <span className="w-9 text-left tabular-nums">
              {formatTime(totalDuration)}
            </span>
          </div>
        </div>

        {/* Right Section: Volume & Queue Auxiliary Controls */}
        <div className="flex items-center justify-end gap-3 w-1/4 min-w-[120px] max-w-[240px]">
          {/* Toggle Up Next Queue Drawer */}
          <button
            onClick={toggleQueue}
            aria-label={isQueueOpen ? "Close queue" : "Open queue"}
            className={`flex h-9 w-9 items-center justify-center rounded-full bg-[var(--bg-surface)] transition-all cursor-pointer ${
              isQueueOpen
                ? "shadow-sunken text-[var(--text-primary)]"
                : "shadow-raised-sm active:shadow-sunken-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
            title="Queue"
          >
            <ListMusic className="h-4 w-4" />
          </button>

          {/* Expand Fullscreen Now Playing Overlay */}
          <button
            onClick={openNowPlaying}
            disabled={!currentTrack}
            aria-label="Expand Now Playing"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] shadow-raised-sm active:shadow-sunken-sm transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            title="Expand Now Playing"
          >
            <Maximize2 className="h-4 w-4" />
          </button>

          {/* Mute Toggle */}
          <button
            onClick={handleToggleMute}
            aria-label={volume === 0 ? "Unmute" : "Mute"}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] shadow-raised-sm active:shadow-sunken-sm transition-all cursor-pointer"
          >
            {renderVolumeIcon()}
          </button>

          {/* Volume Slider in an Indented Groove */}
          <div className="hidden sm:flex items-center w-24 h-2.5 rounded-full bg-[var(--bg-surface)] shadow-sunken-sm px-0.5">
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
      </footer>

      {/* Up Next Slide-over Drawer */}
      <QueueDrawer />

      {/* Toast Notifications */}
      <Toast />
    </>
  );
}

export default PlayerBar;
