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
  Heart,
} from "lucide-react";
import { useAudioStore } from "@/stores/useAudioStore";
import { useLikesStore } from "@/stores/useLikesStore";

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
    currentTime,
    duration,
    volume,
    togglePlay,
    seek,
    setVolume,
    playNext,
    playPrevious,
  } = useAudioStore();

  const { isLiked, toggleLike } = useLikesStore();

  const [isDragging, setIsDragging] = useState(false);
  const [dragTime, setDragTime] = useState(0);
  const prevVolumeRef = useRef<number>(volume > 0 ? volume : 0.8);
  const dragTimeRef = useRef<number>(0);

  const timelineSliderId = useId();
  const volumeSliderId = useId();

  // Keep ref synchronized with dragTime for global listeners
  useEffect(() => {
    dragTimeRef.current = dragTime;
  }, [dragTime]);

  // Keep track of non-zero volume for restore on unmute
  useEffect(() => {
    if (volume > 0) {
      prevVolumeRef.current = volume;
    }
  }, [volume]);

  // Global pointerup to reliably release drag even if mouse leaves the slider element
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
    const initialVal = parseFloat(e.currentTarget.value);
    setDragTime(initialVal);
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setDragTime(val);
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
      return <VolumeX className="h-4 w-4 text-zinc-500" />;
    }
    if (volume < 0.5) {
      return <Volume1 className="h-4 w-4 text-zinc-400 group-hover:text-zinc-200 transition-colors" />;
    }
    return <Volume2 className="h-4 w-4 text-zinc-400 group-hover:text-zinc-200 transition-colors" />;
  };

  return (
    <footer
      aria-label="Persistent Audio Player"
      className="fixed bottom-0 left-0 right-0 h-20 bg-zinc-900/90 backdrop-blur-md border-t border-zinc-800 px-4 md:px-6 z-50 flex items-center justify-between shadow-2xl"
    >
      {/* Left Section: Track Info / Placeholder */}
      <div className="flex items-center gap-3 w-1/4 min-w-[140px] sm:min-w-[180px] max-w-[280px]">
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-zinc-800 border border-zinc-700/60 shadow-inner">
          {currentTrack?.cover_url ? (
            <Image
              src={currentTrack.cover_url}
              alt={currentTrack.title || "Track artwork"}
              fill
              sizes="48px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-zinc-500">
              <Music2 className="h-5 w-5" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 truncate">
          {currentTrack ? (
            <>
              <p className="text-sm font-medium text-zinc-100 truncate">
                {currentTrack.title}
              </p>
              <p className="text-xs text-zinc-400 truncate">
                {currentTrack.artist}
                {currentTrack.album ? ` • ${currentTrack.album}` : ""}
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-zinc-400 truncate">
                No track selected
              </p>
              <p className="text-xs text-zinc-500 truncate">
                Choose a track to play
              </p>
            </>
          )}
        </div>

        {currentTrack && (
          <button
            onClick={() => toggleLike(currentTrack.id)}
            aria-label={isLiked(currentTrack.id) ? "Unlike track" : "Like track"}
            className="p-1 rounded text-zinc-400 hover:text-emerald-400 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-400 cursor-pointer"
          >
            <Heart
              className={`h-4 w-4 transition-transform active:scale-125 ${
                isLiked(currentTrack.id)
                  ? "fill-emerald-400 text-emerald-400"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            />
          </button>
        )}
      </div>

      {/* Center Section: Controls & Timeline Scrubber */}
      <div className="flex flex-col items-center gap-1.5 flex-1 max-w-xl px-2 sm:px-4 md:px-6">
        {/* Playback Buttons */}
        <div className="flex items-center gap-4">
          <button
            onClick={playPrevious}
            disabled={!currentTrack}
            aria-label="Previous track (restart if > 3s)"
            className="text-zinc-400 transition-colors hover:text-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 rounded p-1"
          >
            <SkipBack className="h-4 w-4" />
          </button>

          <button
            onClick={togglePlay}
            disabled={!currentTrack}
            aria-label={isPlaying ? "Pause track" : "Play track"}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-zinc-950 shadow-lg shadow-emerald-500/25 transition-all hover:bg-emerald-400 hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
          >
            {isPlaying ? (
              <Pause className="h-5 w-5 fill-zinc-950" />
            ) : (
              <Play className="h-5 w-5 fill-zinc-950 ml-0.5" />
            )}
          </button>

          <button
            onClick={playNext}
            disabled={!currentTrack}
            aria-label="Next track"
            className="text-zinc-400 transition-colors hover:text-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 rounded p-1"
          >
            <SkipForward className="h-4 w-4" />
          </button>
        </div>

        {/* Timeline Scrubber */}
        <div className="flex w-full items-center gap-2.5 text-xs font-mono text-zinc-400 select-none">
          <span className="w-10 text-right tabular-nums">
            {formatTime(displayTime)}
          </span>

          <div className="relative flex-1 flex items-center">
            <label htmlFor={timelineSliderId} className="sr-only">
              Timeline Scrubber
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
                background: `linear-gradient(to right, #10b981 ${clampedProgress}%, #27272a ${clampedProgress}%)`,
              }}
              className="w-full h-1.5 appearance-none rounded-lg cursor-pointer accent-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            />
          </div>

          <span className="w-10 text-left tabular-nums">
            {formatTime(totalDuration)}
          </span>
        </div>
      </div>

      {/* Right Section: Volume & Aux Controls */}
      <div className="flex items-center justify-end gap-2.5 w-1/4 min-w-[100px] sm:min-w-[140px] max-w-[240px]">
        <button
          onClick={handleToggleMute}
          aria-label={volume === 0 ? "Unmute sound" : "Mute sound"}
          className="group rounded p-1 text-zinc-400 hover:text-zinc-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
        >
          {renderVolumeIcon()}
        </button>

        <div className="hidden sm:flex items-center w-20 md:w-28">
          <label htmlFor={volumeSliderId} className="sr-only">
            Volume Slider
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
              background: `linear-gradient(to right, #10b981 ${volumePercent}%, #27272a ${volumePercent}%)`,
            }}
            className="w-full h-1.5 appearance-none rounded-lg cursor-pointer accent-white transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-400"
          />
        </div>
      </div>
    </footer>
  );
}

export default PlayerBar;
