"use client";

import { useState } from "react";
import Image from "next/image";
import {
  ListMusic,
  X,
  Play,
  Trash2,
  Shuffle,
  GripVertical,
  Music2,
  Radio,
  Loader2,
} from "lucide-react";
import { useAudioStore } from "@/stores/useAudioStore";

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function QueueDrawer() {
  const {
    currentTrack,
    isPlaying,
    isAutoQueueLoading,
    queue,
    queueIndex,
    isQueueOpen,
    setIsQueueOpen,
    playQueueIndex,
    clearQueue,
    shuffleRemaining,
    removeFromQueue,
    reorderQueue,
  } = useAudioStore();

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  if (!isQueueOpen) return null;

  // Items coming up after currentTrack
  const upcomingStartIndex = queueIndex >= 0 ? queueIndex + 1 : 0;
  const upcomingTracks = queue.slice(upcomingStartIndex);

  const handleDragStart = (e: React.DragEvent, localIdx: number) => {
    setDraggedIndex(localIdx);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetLocalIdx: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetLocalIdx) return;

    const fromGlobal = upcomingStartIndex + draggedIndex;
    const toGlobal = upcomingStartIndex + targetLocalIdx;

    reorderQueue(fromGlobal, toGlobal);
    setDraggedIndex(null);
  };

  return (
    <>
      {/* Backdrop overlay */}
      <div
        onClick={() => setIsQueueOpen(false)}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 transition-opacity"
        aria-hidden="true"
      />

      {/* Slide-over panel */}
      <aside
        aria-label="Queue Slide-over Panel"
        className="fixed top-0 bottom-[88px] right-0 z-50 w-full sm:max-w-md bg-[#121212]/95 backdrop-blur-xl border-l border-[#282828] shadow-2xl flex flex-col animate-in slide-in-from-right duration-200 select-none"
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-[#282828] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1DB954]/10 text-[#1DB954] border border-[#1DB954]/20">
              <ListMusic className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                Play Queue
                <span className="rounded-full bg-[#282828] px-2 py-0.5 text-[10px] font-mono text-[#B3B3B3]">
                  {queue.length}
                </span>
              </h2>
            </div>
          </div>

          <button
            onClick={() => setIsQueueOpen(false)}
            aria-label="Close queue drawer"
            className="rounded-lg p-1.5 text-[#B3B3B3] hover:text-white hover:bg-[#282828] transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Action Controls Bar: Clear Queue & Shuffle Remaining */}
        <div className="flex items-center justify-between border-b border-[#282828]/60 bg-[#161616]/60 px-5 py-2.5 gap-2">
          <span className="text-xs font-semibold text-[#B3B3B3]">Controls</span>

          <div className="flex items-center gap-2">
            <button
              onClick={shuffleRemaining}
              disabled={upcomingTracks.length <= 1}
              title="Shuffle remaining tracks in queue"
              className="flex items-center gap-1.5 rounded-lg border border-[#282828] bg-[#1a1a1a] px-2.5 py-1 text-xs font-medium text-[#B3B3B3] hover:text-white hover:bg-[#282828] disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              <Shuffle className="h-3 w-3 text-[#1DB954]" />
              <span>Shuffle Remaining</span>
            </button>

            <button
              onClick={clearQueue}
              disabled={upcomingTracks.length === 0}
              title="Clear all upcoming tracks from queue"
              className="flex items-center gap-1.5 rounded-lg border border-[#282828] bg-[#1a1a1a] px-2.5 py-1 text-xs font-medium text-[#B3B3B3] hover:text-red-400 hover:bg-[#282828] disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              <Trash2 className="h-3 w-3" />
              <span>Clear Queue</span>
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6 custom-scrollbar">
          {/* NOW PLAYING SECTION */}
          <div>
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#1DB954] mb-2.5">
              <div className="flex items-center gap-1.5">
                <Radio className="h-3.5 w-3.5" />
                <span>Now Playing</span>
              </div>

              {/* 3-bar animated CSS equalizer badge */}
              {currentTrack && (
                <div
                  className="flex items-end gap-1 h-4 px-2 py-0.5 rounded bg-[#1DB954]/10 border border-[#1DB954]/20"
                  title={isPlaying ? "Playing" : "Paused"}
                >
                  {isPlaying ? (
                    <>
                      <span className="w-1 bg-[#1DB954] rounded-full animate-waveform-1" />
                      <span className="w-1 bg-[#1DB954] rounded-full animate-waveform-2" />
                      <span className="w-1 bg-[#1DB954] rounded-full animate-waveform-3" />
                    </>
                  ) : (
                    <>
                      <span className="w-1 h-1 bg-[#1DB954]/50 rounded-full" />
                      <span className="w-1 h-2.5 bg-[#1DB954]/50 rounded-full" />
                      <span className="w-1 h-1.5 bg-[#1DB954]/50 rounded-full" />
                    </>
                  )}
                </div>
              )}
            </div>

            {currentTrack ? (
              <div className="group relative flex items-center gap-4 rounded-xl border border-[#1DB954]/30 bg-[#1DB954]/5 p-4 shadow-lg backdrop-blur-md">
                {/* Large Artwork */}
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-[#282828] shadow-md border border-white/5">
                  {currentTrack.cover_url ? (
                    <Image
                      src={currentTrack.cover_url}
                      alt={currentTrack.title}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[#B3B3B3]">
                      <Music2 className="h-6 w-6" />
                    </div>
                  )}
                </div>

                {/* Track Details */}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-white truncate">
                    {currentTrack.title}
                  </p>
                  <p className="text-xs text-[#B3B3B3] truncate mt-1">
                    {currentTrack.artist}
                  </p>
                  {currentTrack.album && (
                    <p className="text-[11px] text-[#757575] truncate mt-0.5">
                      {currentTrack.album}
                    </p>
                  )}
                </div>

                {/* 3-Bar Animated CSS Equalizer on the right side */}
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <div
                    className="flex items-end gap-1 h-5"
                    title={isPlaying ? "Playing" : "Paused"}
                  >
                    {isPlaying ? (
                      <>
                        <span className="w-1 bg-[#1DB954] rounded-full animate-waveform-1" />
                        <span className="w-1 bg-[#1DB954] rounded-full animate-waveform-2" />
                        <span className="w-1 bg-[#1DB954] rounded-full animate-waveform-3" />
                      </>
                    ) : (
                      <>
                        <span className="w-1 h-1.5 bg-[#1DB954]/50 rounded-full" />
                        <span className="w-1 h-3.5 bg-[#1DB954]/50 rounded-full" />
                        <span className="w-1 h-2 bg-[#1DB954]/50 rounded-full" />
                      </>
                    )}
                  </div>
                  <span className="text-[11px] font-mono text-[#1DB954]">
                    {formatTime(currentTrack.duration)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-[#282828] bg-[#181818]/60 p-4 text-center text-xs text-[#757575]">
                No track currently playing
              </div>
            )}
          </div>

          {/* NEXT UP SECTION */}
          <div>
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#B3B3B3] mb-2.5">
              <div className="flex items-center gap-2">
                <span>Next Up</span>
                {isAutoQueueLoading && (
                  <span className="flex items-center gap-1 normal-case text-[11px] font-medium text-[#1DB954] bg-[#1DB954]/10 px-2 py-0.5 rounded-full border border-[#1DB954]/20">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Finding similar songs...
                  </span>
                )}
              </div>
              <span className="text-[11px] font-mono text-[#757575] font-normal">
                {upcomingTracks.length} upcoming
              </span>
            </div>

            {upcomingTracks.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#282828] bg-[#181818]/40 p-6 text-center">
                <Music2 className="h-6 w-6 text-[#757575] mx-auto mb-2" />
                <p className="text-xs font-semibold text-[#B3B3B3]">
                  Your queue is empty
                </p>
                <p className="text-[11px] text-[#757575] mt-1">
                  Song Radio will automatically queue similar songs as you listen.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {upcomingTracks.map((track, localIdx) => {
                  const globalIdx = upcomingStartIndex + localIdx;
                  const isBeingDragged = draggedIndex === localIdx;

                  return (
                    <div
                      key={`${track.id}-${globalIdx}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, localIdx)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, localIdx)}
                      className={`group flex items-center justify-between gap-3 rounded-lg p-2.5 transition-all duration-150 cursor-pointer ${
                        isBeingDragged
                          ? "opacity-40 border border-dashed border-[#1DB954] bg-[#282828]"
                          : "bg-[#181818]/60 hover:bg-[#282828]/80 border border-transparent hover:border-[#282828]"
                      }`}
                      onClick={() => playQueueIndex(globalIdx)}
                    >
                      {/* Drag Handle & Position Index */}
                      <div className="flex items-center gap-2.5 shrink-0">
                        <span
                          className="text-[#757575] hover:text-[#B3B3B3] cursor-grab active:cursor-grabbing p-0.5"
                          title="Drag to reorder"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <GripVertical className="h-3.5 w-3.5" />
                        </span>

                        <span className="w-4 text-center text-xs font-mono text-[#757575]">
                          {localIdx + 1}
                        </span>

                        {/* Thumbnail */}
                        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded bg-[#282828] shadow-sm">
                          {track.cover_url ? (
                            <Image
                              src={track.cover_url}
                              alt={track.title}
                              fill
                              sizes="40px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[#B3B3B3]">
                              <Music2 className="h-4 w-4" />
                            </div>
                          )}

                          {/* Hover Play Icon Overlay */}
                          <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Play className="h-4 w-4 text-white fill-white ml-0.5" />
                          </div>
                        </div>
                      </div>

                      {/* Title & Artist */}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-white truncate group-hover:text-[#1DB954] transition-colors">
                          {track.title}
                        </p>
                        <p className="text-[11px] text-[#B3B3B3] truncate mt-0.5">
                          {track.artist}
                        </p>
                      </div>

                      {/* Duration & Remove Action */}
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] font-mono text-[#757575]">
                          {formatTime(track.duration)}
                        </span>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFromQueue(globalIdx);
                          }}
                          title="Remove from queue"
                          className="rounded p-1 text-[#757575] opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-[#282828] transition-all cursor-pointer"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}

export default QueueDrawer;
