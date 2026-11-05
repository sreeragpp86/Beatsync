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
  const [isTimelineHovered, setIsTimelineHovered] = useState(false);
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
  const volumePercent = Math.min(100, Math.max(0, volume * 100));

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
      return <VolumeX className="h-4 w-4 text-[#B3B3B3] group-hover:text-white transition-colors" />;
    }
    if (volume < 0.5) {
      return <Volume1 className="h-4 w-4 text-[#B3B3B3] group-hover:text-white transition-colors" />;
    }
    return <Volume2 className="h-4 w-4 text-[#B3B3B3] group-hover:text-white transition-colors" />;
  };

  const activeTrackColor = isTimelineHovered || isDragging ? "#1DB954" : "#FFFFFF";

  return (
    <>
      {/* =========================================================================
          1. MOBILE MINI-PLAYER (Floats right above MobileNav, md:hidden)
          ========================================================================= */}
      {currentTrack && (
        <div
          aria-label="Mobile Mini Player"
          className="fixed bottom-[58px] left-2 right-2 z-40 md:hidden flex flex-col rounded-xl bg-[#12121e]/95 backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.8)] overflow-hidden transition-all duration-300 select-none"
          style={{
            marginBottom: "max(0.25rem, env(safe-area-inset-bottom))",
          }}
        >
          <div className="flex items-center justify-between p-2 gap-2.5">
            {/* Artwork + Title & Artist */}
            <div
              onClick={openNowPlaying}
              className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
              title="Expand Now Playing"
            >
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-[#242424] shadow-sm">
                {currentTrack.cover_url ? (
                  <Image
                    src={currentTrack.cover_url}
                    alt={currentTrack.title || "Track artwork"}
                    fill
                    sizes="40px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[#B3B3B3]">
                    <Music2 className="h-5 w-5" />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1 truncate">
                <p className="text-xs font-bold text-white truncate">
                  {currentTrack.title}
                </p>
                <p className="text-[11px] text-[#A1A1AA] truncate mt-0.5">
                  {currentTrack.artist}
                </p>
              </div>
            </div>

            {/* Mobile Controls: Like, Play/Pause, Next Track, Queue, Expand */}
            <div className="flex items-center gap-1.5 shrink-0">
              <LikeButton track={currentTrack} trackId={currentTrack.id} size={18} />

              <button
                onClick={togglePlay}
                disabled={isLoadingStream}
                aria-label={isLoadingStream ? "Loading stream..." : isPlaying ? "Pause" : "Play"}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-black shadow-md hover:scale-105 active:scale-95 transition-transform cursor-pointer"
              >
                {isLoadingStream ? (
                  <Loader2 className="h-4 w-4 animate-spin text-black" />
                ) : isPlaying ? (
                  <Pause className="h-4 w-4 fill-black" />
                ) : (
                  <Play className="h-4 w-4 fill-black ml-0.5" />
                )}
              </button>

              <button
                onClick={playNext}
                aria-label="Next song"
                className="p-1.5 text-[#B3B3B3] hover:text-white transition-colors cursor-pointer"
              >
                <SkipForward className="h-5 w-5 fill-current" />
              </button>

              <button
                onClick={openNowPlaying}
                aria-label="Expand Now Playing"
                className="p-1.5 text-[#B3B3B3] hover:text-white transition-colors cursor-pointer"
                title="Expand Now Playing"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Micro Progress Bar along bottom edge */}
          <div className="w-full bg-white/10 h-[2px]">
            <div
              className="bg-[#1DB954] h-full transition-all duration-200"
              style={{ width: `${clampedProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* =========================================================================
          2. DESKTOP EXPANSIVE PLAYER DOCK (hidden md:flex)
          ========================================================================= */}
      <footer
        aria-label="Spotify Player Dock"
        className="hidden md:flex fixed bottom-0 left-0 right-0 h-[88px] bg-[#000000] border-t border-[#282828] px-4 md:px-6 z-50 items-center justify-between select-none shadow-2xl"
      >
        {/* Left Section: Current Track Artwork & Metadata */}
        <div className="flex items-center gap-3.5 w-1/4 min-w-[160px] max-w-[280px]">
          <div
            onClick={openNowPlaying}
            className="group/art relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-[#282828] shadow-md cursor-pointer"
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
              <div className="flex h-full w-full items-center justify-center text-[#B3B3B3]">
                <Music2 className="h-6 w-6" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/art:opacity-100 transition-opacity flex items-center justify-center">
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
                <p className="text-sm font-semibold text-white truncate hover:underline">
                  {currentTrack.title}
                </p>
                <p className="text-xs text-[#B3B3B3] truncate hover:underline hover:text-white mt-0.5">
                  {currentTrack.artist}
                  {currentTrack.album ? ` • ${currentTrack.album}` : ""}
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-[#B3B3B3] truncate">
                  No track selected
                </p>
                <p className="text-xs text-[#757575] truncate mt-0.5">
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

        {/* Center Section: Controls & Progress Bar */}
        <div className="flex flex-col items-center gap-2 flex-1 max-w-xl px-2 sm:px-6">
          {/* Controls Buttons */}
          <div className="flex items-center gap-5">
            <button
              onClick={playPrevious}
              disabled={!currentTrack}
              aria-label="Previous song"
              className="text-[#B3B3B3] transition-colors hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer p-1"
            >
              <SkipBack className="h-5 w-5 fill-current" />
            </button>

            <button
              onClick={togglePlay}
              disabled={!currentTrack || isLoadingStream}
              aria-label={isLoadingStream ? "Loading stream..." : isPlaying ? "Pause" : "Play"}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-black shadow hover:scale-105 active:scale-95 transition-transform disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoadingStream ? (
                <Loader2 className="h-4 w-4 animate-spin text-black" />
              ) : isPlaying ? (
                <Pause className="h-4 w-4 fill-black" />
              ) : (
                <Play className="h-4 w-4 fill-black ml-0.5" />
              )}
            </button>

            <button
              onClick={playNext}
              disabled={!currentTrack}
              aria-label="Next song"
              className="text-[#B3B3B3] transition-colors hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer p-1"
            >
              <SkipForward className="h-5 w-5 fill-current" />
            </button>
          </div>

          {/* Timeline Scrubber */}
          <div
            className="flex w-full items-center gap-2.5 text-[11px] font-mono text-[#B3B3B3]"
            onMouseEnter={() => setIsTimelineHovered(true)}
            onMouseLeave={() => setIsTimelineHovered(false)}
          >
            <span className="w-9 text-right tabular-nums">
              {formatTime(displayTime)}
            </span>

            <div className="relative flex-1 flex items-center group">
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
                style={{
                  background: `linear-gradient(to right, ${activeTrackColor} ${clampedProgress}%, #4d4d4d ${clampedProgress}%)`,
                }}
                className="w-full h-1 appearance-none rounded-full cursor-pointer accent-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
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
            className={`rounded-lg p-1.5 transition-all cursor-pointer ${
              isQueueOpen
                ? "text-[#1DB954] bg-[#1DB954]/15 shadow-sm"
                : "text-[#B3B3B3] hover:text-white hover:bg-white/5"
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
            className="rounded-lg p-1.5 text-[#B3B3B3] hover:text-white hover:bg-white/5 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            title="Expand Now Playing"
          >
            <Maximize2 className="h-4 w-4" />
          </button>

          <button
            onClick={handleToggleMute}
            aria-label={volume === 0 ? "Unmute" : "Mute"}
            className="group rounded p-1 text-[#B3B3B3] hover:text-white transition-colors cursor-pointer"
          >
            {renderVolumeIcon()}
          </button>

          <div className="hidden sm:flex items-center w-24">
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
                background: `linear-gradient(to right, #FFFFFF ${volumePercent}%, #4d4d4d ${volumePercent}%)`,
              }}
              className="w-full h-1 appearance-none rounded-full cursor-pointer accent-white transition-all hover:accent-[#1DB954]"
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
