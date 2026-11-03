"use client";

import { useState } from "react";
import Image from "next/image";
import {
  ListMusic,
  X,
  Play,
  Trash2,
  GripVertical,
  Music2,
  Radio,
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
    queue,
    queueIndex,
    isQueueOpen,
    setIsQueueOpen,
    playQueueIndex,
    clearQueue,
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
        className="fixed top-0 bottom-20 right-0 z-50 w-full sm:max-w-md bg-zinc-950/95 backdrop-blur-xl border-l border-zinc-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200"
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ListMusic className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                Play Queue
                <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-mono text-zinc-400">
                  {queue.length}
                </span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {upcomingTracks.length > 0 && (
              <button
                onClick={clearQueue}
                title="Clear upcoming tracks from queue"
                className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition-colors cursor-pointer"
              >
                <Trash2 className="h-3 w-3" />
                <span>Clear</span>
              </button>
            )}

            <button
              onClick={() => setIsQueueOpen(false)}
              aria-label="Close queue drawer"
              className="rounded-lg p-1 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          {/* NOW PLAYING SECTION */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-2.5">
              <Radio className="h-3.5 w-3.5" />
              <span>Now Playing</span>
            </div>

            {currentTrack ? (
              <div className="group relative flex items-center gap-3.5 rounded-xl border border-emerald-500/30 bg-emerald-950/15 p-3.5 shadow-sm">
                {/* Artwork */}
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-zinc-800 shadow-inner">
                  {currentTrack.cover_url ? (
                    <Image
                      src={currentTrack.cover_url}
                      alt={currentTrack.title}
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-zinc-500">
                      <Music2 className="h-5 w-5" />
                    </div>
                  )}
                </div>

                {/* Track Details */}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-zinc-100 truncate">
                    {currentTrack.title}
                  </p>
                  <p className="text-xs text-zinc-400 truncate mt-0.5">
                    {currentTrack.artist}
                  </p>
                  {currentTrack.album && (
                    <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                      {currentTrack.album}
                    </p>
                  )}
                </div>

                {/* Animated Equalizer Waveform & Duration */}
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <div
                    className="flex items-end gap-0.5 h-4"
                    title={isPlaying ? "Playing" : "Paused"}
                  >
                    {isPlaying ? (
                      <>
                        <span className="w-1 bg-emerald-400 rounded-full animate-waveform-1" />
                        <span className="w-1 bg-emerald-400 rounded-full animate-waveform-2" />
                        <span className="w-1 bg-emerald-400 rounded-full animate-waveform-3" />
                        <span className="w-1 bg-emerald-400 rounded-full animate-waveform-4" />
                      </>
                    ) : (
                      <>
                        <span className="w-1 h-1.5 bg-emerald-400/50 rounded-full" />
                        <span className="w-1 h-3 bg-emerald-400/50 rounded-full" />
                        <span className="w-1 h-2 bg-emerald-400/50 rounded-full" />
                        <span className="w-1 h-1 bg-emerald-400/50 rounded-full" />
                      </>
                    )}
                  </div>
                  <span className="text-[11px] font-mono text-emerald-400">
                    {formatTime(currentTrack.duration)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 text-center text-xs text-zinc-500">
                No track currently playing
              </div>
            )}
          </div>

          {/* UP NEXT SECTION */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2.5">
              <span>Up Next</span>
              <span className="text-[11px] font-mono text-zinc-500 font-normal">
                {upcomingTracks.length} upcoming
              </span>
            </div>

            {upcomingTracks.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/20 p-6 text-center">
                <Music2 className="h-6 w-6 text-zinc-600 mx-auto mb-2" />
                <p className="text-xs font-medium text-zinc-400">
                  Your queue is empty
                </p>
                <p className="text-[11px] text-zinc-600 mt-1">
                  Click any track in Explore to auto-generate an upcoming playlist.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
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
                      className={`group flex items-center justify-between gap-3 rounded-xl border p-2.5 transition-all duration-150 cursor-pointer ${
                        isBeingDragged
                          ? "opacity-40 border-dashed border-emerald-500 bg-zinc-900"
                          : "border-zinc-800/60 bg-zinc-900/30 hover:border-zinc-700 hover:bg-zinc-900/80"
                      }`}
                      onClick={() => playQueueIndex(globalIdx)}
                    >
                      {/* Drag Handle & Position Index */}
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className="text-zinc-600 hover:text-zinc-400 cursor-grab active:cursor-grabbing p-0.5"
                          title="Drag to reorder"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <GripVertical className="h-3.5 w-3.5" />
                        </span>

                        <span className="w-4 text-center text-xs font-mono text-zinc-500">
                          {localIdx + 1}
                        </span>

                        {/* Thumbnail */}
                        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-zinc-800 shadow-inner">
                          {track.cover_url ? (
                            <Image
                              src={track.cover_url}
                              alt={track.title}
                              fill
                              sizes="40px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-zinc-500">
                              <Music2 className="h-4 w-4" />
                            </div>
                          )}

                          {/* Hover Play Icon */}
                          <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/60 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Play className="h-4 w-4 text-white fill-white ml-0.5" />
                          </div>
                        </div>
                      </div>

                      {/* Title & Artist */}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-zinc-200 truncate group-hover:text-emerald-400 transition-colors">
                          {track.title}
                        </p>
                        <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                          {track.artist}
                        </p>
                      </div>

                      {/* Duration & Remove Action */}
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] font-mono text-zinc-500">
                          {formatTime(track.duration)}
                        </span>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFromQueue(globalIdx);
                          }}
                          title="Remove from queue"
                          className="rounded p-1 text-zinc-500 opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-zinc-800 transition-all cursor-pointer"
                        >
                          <X className="h-3 w-3" />
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
