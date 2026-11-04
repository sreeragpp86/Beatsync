"use client";

import { useState, useEffect, useRef, useId, useCallback } from "react";
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
    playNext,
    playPrevious,
    toggleQueue,
    isQueueOpen,
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

  const handleToggleMute = useCallback(() => {
    if (volume > 0) {
      prevVolumeRef.current = volume;
      setVolume(0);
    } else {
      setVolume(prevVolumeRef.current > 0 ? prevVolumeRef.current : 0.8);
    }
  }, [volume, setVolume]);

  const renderVolumeIcon = () => {
    if (volume === 0) {
      return <VolumeX className="h-4 w-4 text-[#B3B3B3]" />;
    }
    if (volume < 0.5) {
      return <Volume1 className="h-4 w-4 text-[#B3B3B3] group-hover:text-white transition-colors" />;
    }
    return <Volume2 className="h-4 w-4 text-[#B3B3B3] group-hover:text-white transition-colors" />;
  };

  // Color for the active progress bar (green on hover/drag, white default)
  const activeTrackColor = isTimelineHovered || isDragging ? "#1DB954" : "#FFFFFF";

  return (
    <>
      <footer
        aria-label="Spotify Player Dock"
        className="fixed bottom-0 left-0 right-0 h-[88px] bg-[#000000] border-t border-[#282828] px-4 md:px-6 z-50 flex items-center justify-between select-none shadow-2xl"
      >
        {/* Left Section: Current Track Artwork & Metadata */}
        <div className="flex items-center gap-3.5 w-1/4 min-w-[160px] max-w-[280px]">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-[#282828] shadow-md">
            {currentTrack?.cover_url ? (
              <Image
                src={currentTrack.cover_url}
                alt={currentTrack.title || "Track artwork"}
                fill
                sizes="56px"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[#B3B3B3]">
                <Music2 className="h-6 w-6" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            {currentTrack ? (
              <>
                <p className="text-sm font-semibold text-white truncate hover:underline cursor-pointer">
                  {currentTrack.title}
                </p>
                <p className="text-xs text-[#B3B3B3] truncate hover:underline hover:text-white cursor-pointer mt-0.5">
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
            <div className="shrink-0">
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
            className={`rounded p-1.5 transition-colors cursor-pointer ${
              isQueueOpen
                ? "text-[#1DB954]"
                : "text-[#B3B3B3] hover:text-white"
            }`}
            title="Queue"
          >
            <ListMusic className="h-4 w-4" />
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
