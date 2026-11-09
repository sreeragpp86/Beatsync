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
  Plus,
  ChevronUp,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import { useAudioStore } from "@/stores/useAudioStore";
import {
  useDynamicQueueStore,
  VibeType,
  DynamicTrackReason,
} from "@/stores/useDynamicQueueStore";

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

const VIBE_CHIPS: { id: VibeType; label: string; icon: string }[] = [
  { id: "balanced", label: "Balanced", icon: "✦" },
  { id: "deep-cuts", label: "Deep Cuts", icon: "⚡" },
  { id: "familiar", label: "Liked Radio", icon: "♥" },
  { id: "upbeat", label: "High Energy", icon: "🔥" },
];

export function QueueDrawer() {
  const {
    currentTrack,
    isQueueOpen,
    setIsQueueOpen,
    playTrack,
    playQueueIndex,
    queue,
    queueIndex,
    clearQueue,
    shuffleRemaining,
    removeFromQueue,
    reorderQueue,
    isAutoQueueLoading,
  } = useAudioStore();

  const {
    isDynamicQueueEnabled,
    setDynamicQueueEnabled,
    userQueue,
    dynamicPool,
    currentVibe,
    isReplenishing,
    setVibe,
    addToUserQueue,
    removeFromUserQueue,
    reorderUserQueue,
    clearUserQueue,
    shuffleUserQueue,
    removeFromDynamicPool,
    replenishPool,
  } = useDynamicQueueStore();

  const [draggedUserIndex, setDraggedUserIndex] = useState<number | null>(null);
  const [draggedClassicIndex, setDraggedClassicIndex] = useState<number | null>(null);

  if (!isQueueOpen) return null;

  // Classic queue upcoming items
  const upcomingStartIndex = queueIndex >= 0 ? queueIndex + 1 : 0;
  const classicUpcomingTracks = queue.slice(upcomingStartIndex);

  const totalUpcoming = isDynamicQueueEnabled
    ? userQueue.length + dynamicPool.length
    : classicUpcomingTracks.length;

  // Handlers for User Queue Drag & Drop
  const handleUserDragStart = (e: React.DragEvent, idx: number) => {
    setDraggedUserIndex(idx);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleUserDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleUserDrop = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    if (draggedUserIndex === null || draggedUserIndex === targetIdx) return;
    reorderUserQueue(draggedUserIndex, targetIdx);
    setDraggedUserIndex(null);
  };

  // Handlers for Classic Queue Drag & Drop
  const handleClassicDragStart = (e: React.DragEvent, localIdx: number) => {
    setDraggedClassicIndex(localIdx);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleClassicDrop = (e: React.DragEvent, targetLocalIdx: number) => {
    e.preventDefault();
    if (draggedClassicIndex === null || draggedClassicIndex === targetLocalIdx) return;
    const fromGlobal = upcomingStartIndex + draggedClassicIndex;
    const toGlobal = upcomingStartIndex + targetLocalIdx;
    reorderQueue(fromGlobal, toGlobal);
    setDraggedClassicIndex(null);
  };

  const renderBadge = (reason?: DynamicTrackReason) => {
    switch (reason) {
      case "Same Artist":
        return (
          <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--bg-surface)] shadow-sunken-sm text-indigo-500 shrink-0">
            Same Artist
          </span>
        );
      case "Deep Cut":
        return (
          <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--bg-surface)] shadow-sunken-sm text-amber-500 shrink-0">
            Deep Cut
          </span>
        );
      case "Liked Radio":
        return (
          <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--bg-surface)] shadow-sunken-sm text-rose-500 shrink-0">
            Liked Radio
          </span>
        );
      case "Vibe Match":
      default:
        return (
          <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--bg-surface)] shadow-sunken-sm text-[#E07A5F] shrink-0">
            Vibe Match
          </span>
        );
    }
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
        className="fixed top-0 bottom-0 md:bottom-[88px] right-0 z-50 w-full sm:max-w-md bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-raised flex flex-col animate-in slide-in-from-right duration-200 select-none"
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2 border-b border-[var(--text-secondary)]/10">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--bg-surface)] shadow-sunken-sm text-[var(--text-primary)]">
              <ListMusic className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                {isDynamicQueueEnabled ? "Dynamic Queue" : "YouTube Queue"}
                <span className="rounded-full bg-[var(--bg-surface)] shadow-sunken-sm px-2.5 py-0.5 text-[10px] font-mono text-[var(--text-secondary)]">
                  {totalUpcoming} upcoming
                </span>
              </h2>
            </div>
          </div>

          <button
            onClick={() => setIsQueueOpen(false)}
            aria-label="Close queue drawer"
            className="rounded-xl p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-surface)] shadow-raised-sm active:shadow-sunken-sm transition-all cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* QUEUE MODE SELECTOR (Dynamic Flow vs Classic YouTube) */}
        <div className="px-5 pt-3 pb-2 border-b border-[var(--text-secondary)]/10">
          <div className="flex items-center p-1 rounded-2xl bg-[var(--bg-surface)] shadow-sunken-sm">
            <button
              onClick={() => {
                setDynamicQueueEnabled(true);
                if (dynamicPool.length < 3) {
                  replenishPool(currentTrack);
                }
              }}
              className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                isDynamicQueueEnabled
                  ? "bg-[var(--bg-surface)] shadow-raised-sm text-[#E07A5F]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Dynamic AI Flow</span>
            </button>

            <button
              onClick={() => setDynamicQueueEnabled(false)}
              className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                !isDynamicQueueEnabled
                  ? "bg-[var(--bg-surface)] shadow-raised-sm text-[#E07A5F]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              <Radio className="h-3.5 w-3.5" />
              <span>Classic YouTube</span>
            </button>
          </div>
        </div>

        {/* VIBE STEERING CAROUSEL (Rendered only when Dynamic Queue is enabled) */}
        {isDynamicQueueEnabled && (
          <div className="px-5 py-3 border-b border-[var(--text-secondary)]/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-[#E07A5F]" />
                Steer Queue Vibe
              </span>
              {isReplenishing && (
                <span className="flex items-center gap-1 text-[11px] text-[var(--text-secondary)]">
                  <Loader2 className="h-3 w-3 animate-spin text-[#E07A5F]" />
                  Adapting...
                </span>
              )}
            </div>

            <div
              className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {VIBE_CHIPS.map((vibe) => {
                const isActive = currentVibe === vibe.id;
                return (
                  <button
                    key={vibe.id}
                    onClick={() => setVibe(vibe.id, currentTrack)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                      isActive
                        ? "bg-[var(--bg-surface)] shadow-sunken-sm text-[#E07A5F]"
                        : "bg-[var(--bg-surface)] shadow-raised-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:shadow-sunken-sm"
                    }`}
                  >
                    <span className="text-xs">{vibe.icon}</span>
                    <span>{vibe.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6 custom-scrollbar">
          {/* NOW PLAYING SECTION */}
          <div>
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2.5">
              <div className="flex items-center gap-1.5">
                <Radio className="h-3.5 w-3.5 text-[#E07A5F]" />
                <span>Now Playing</span>
              </div>
            </div>

            {currentTrack ? (
              <div className="group relative flex items-center gap-3.5 rounded-2xl bg-[var(--bg-surface)] shadow-sunken-sm p-3.5">
                {/* Artwork */}
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[var(--bg-surface)] shadow-sunken-sm">
                  {currentTrack.cover_url ? (
                    <Image
                      src={currentTrack.cover_url}
                      alt={currentTrack.title}
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[var(--text-secondary)]">
                      <Music2 className="h-5 w-5" />
                    </div>
                  )}
                </div>

                {/* Track Details */}
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-bold text-[var(--text-primary)] truncate">
                    {currentTrack.title}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] truncate mt-0.5">
                    {currentTrack.artist}
                  </p>
                  {currentTrack.album && (
                    <p className="text-[10px] text-[var(--text-secondary)] truncate mt-0.5 opacity-80">
                      {currentTrack.album}
                    </p>
                  )}
                </div>

                {/* Track Duration */}
                <span className="text-[11px] font-mono text-[var(--text-secondary)] shrink-0">
                  {formatTime(currentTrack.duration)}
                </span>
              </div>
            ) : (
              <div className="rounded-2xl bg-[var(--bg-surface)] shadow-sunken-sm p-4 text-center text-xs text-[var(--text-secondary)]">
                No track currently playing
              </div>
            )}
          </div>

          {/* =========================================================================
              VIEW 1: DYNAMIC QUEUE MODE ACTIVE
              ========================================================================= */}
          {isDynamicQueueEnabled ? (
            <>
              {/* SECTION 1: "Up Next (From You)" (Only renders if userQueue.length > 0) */}
              {userQueue.length > 0 && (
                <div>
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2.5">
                    <div className="flex items-center gap-2">
                      <span>Up Next (From You)</span>
                      <span className="rounded-full bg-[var(--bg-surface)] shadow-sunken-sm px-2 py-0.5 text-[10px] font-mono text-[#E07A5F]">
                        {userQueue.length}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={shuffleUserQueue}
                        disabled={userQueue.length <= 1}
                        title="Shuffle manual queue"
                        className="p-1 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-surface)] shadow-raised-sm active:shadow-sunken-sm transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Shuffle className="h-3 w-3 text-[#E07A5F]" />
                      </button>
                      <button
                        onClick={clearUserQueue}
                        title="Clear manual queue"
                        className="p-1 rounded-lg text-[var(--text-secondary)] hover:text-red-500 bg-[var(--bg-surface)] shadow-raised-sm active:shadow-sunken-sm transition-all cursor-pointer"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    {userQueue.map((track, idx) => {
                      const isBeingDragged = draggedUserIndex === idx;

                      return (
                        <div
                          key={`user-queue-${track.id}-${idx}`}
                          draggable
                          onDragStart={(e) => handleUserDragStart(e, idx)}
                          onDragOver={handleUserDragOver}
                          onDrop={(e) => handleUserDrop(e, idx)}
                          className={`group flex items-center justify-between gap-2.5 rounded-xl p-2 transition-all duration-150 cursor-pointer ${
                            isBeingDragged
                              ? "opacity-40 shadow-sunken-sm"
                              : "hover:shadow-raised-sm active:shadow-sunken-sm"
                          }`}
                          onClick={() => {
                            playTrack(track);
                            removeFromUserQueue(track.id);
                          }}
                        >
                          {/* Drag Handle & Position */}
                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-grab active:cursor-grabbing p-0.5"
                              title="Drag to reorder"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <GripVertical className="h-3.5 w-3.5" />
                            </span>

                            <span className="w-3.5 text-center text-[11px] font-mono text-[var(--text-secondary)]">
                              {idx + 1}
                            </span>

                            {/* Thumbnail */}
                            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-[var(--bg-surface)] shadow-sunken-sm">
                              {track.cover_url ? (
                                <Image
                                  src={track.cover_url}
                                  alt={track.title}
                                  fill
                                  sizes="40px"
                                  className="object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-[var(--text-secondary)]">
                                  <Music2 className="h-4 w-4" />
                                </div>
                              )}

                              <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg-surface)]/70 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Play className="h-3.5 w-3.5 text-[var(--text-primary)] fill-current ml-0.5" />
                              </div>
                            </div>
                          </div>

                          {/* Title & Artist */}
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                              {track.title}
                            </p>
                            <p className="text-[11px] text-[var(--text-secondary)] truncate mt-0.5">
                              {track.artist}
                            </p>
                          </div>

                          {/* Quick Move Up/Down & Remove */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <div className="hidden sm:flex flex-col opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (idx > 0) reorderUserQueue(idx, idx - 1);
                                }}
                                disabled={idx === 0}
                                title="Move up"
                                className="p-0.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-20 cursor-pointer"
                              >
                                <ChevronUp className="h-3 w-3" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (idx < userQueue.length - 1) reorderUserQueue(idx, idx + 1);
                                }}
                                disabled={idx === userQueue.length - 1}
                                title="Move down"
                                className="p-0.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-20 cursor-pointer"
                              >
                                <ChevronDown className="h-3 w-3" />
                              </button>
                            </div>

                            <span className="text-[11px] font-mono text-[var(--text-secondary)]">
                              {formatTime(track.duration)}
                            </span>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeFromUserQueue(track.id);
                              }}
                              title="Remove from queue"
                              className="rounded-lg p-1 text-[var(--text-secondary)] opacity-0 group-hover:opacity-100 hover:text-red-500 hover:shadow-raised-sm active:shadow-sunken-sm transition-all cursor-pointer"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SECTION 2: "Dynamic Flow (Auto-Adapting)" */}
              <div>
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2.5">
                  <div className="flex items-center gap-2">
                    <span>Dynamic Flow (Auto-Adapting)</span>
                    <span className="rounded-full bg-[var(--bg-surface)] shadow-sunken-sm px-2 py-0.5 text-[10px] font-mono text-[var(--text-secondary)]">
                      {dynamicPool.length} buffered
                    </span>
                  </div>

                  <button
                    onClick={() => replenishPool(currentTrack)}
                    disabled={isReplenishing}
                    title="Refresh dynamic suggestions"
                    className="text-[10px] normal-case font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-2.5 py-0.5 rounded-full bg-[var(--bg-surface)] shadow-raised-sm active:shadow-sunken-sm transition-all cursor-pointer"
                  >
                    {isReplenishing ? "Adapting..." : "Refresh Flow"}
                  </button>
                </div>

                {dynamicPool.length === 0 ? (
                  <div className="rounded-2xl bg-[var(--bg-surface)] shadow-sunken-sm p-5 text-center">
                    <Music2 className="h-6 w-6 text-[var(--text-secondary)] mx-auto mb-2" />
                    <p className="text-xs font-semibold text-[var(--text-primary)]">
                      Adapting your queue
                    </p>
                    <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                      Dynamic flow will automatically queue tracks based on your selected vibe.
                    </p>
                    <button
                      onClick={() => replenishPool(currentTrack)}
                      className="mt-3 px-3 py-1 rounded-full text-xs font-semibold bg-[var(--bg-surface)] shadow-raised-sm active:shadow-sunken-sm text-[var(--text-primary)] cursor-pointer"
                    >
                      Generate Recommendations
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {dynamicPool.map((track, idx) => {
                      const displayIndex = userQueue.length + idx + 1;

                      return (
                        <div
                          key={`dynamic-pool-${track.id}-${idx}`}
                          className="group flex items-center justify-between gap-2.5 rounded-xl p-2 hover:shadow-raised-sm active:shadow-sunken-sm transition-all duration-150 cursor-pointer"
                          onClick={() => {
                            playTrack(track);
                            removeFromDynamicPool(track.id, track);
                          }}
                        >
                          {/* Position & Thumbnail */}
                          <div className="flex items-center gap-2.5 shrink-0">
                            <span className="w-3.5 text-center text-[11px] font-mono text-[var(--text-secondary)]">
                              {displayIndex}
                            </span>

                            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-[var(--bg-surface)] shadow-sunken-sm">
                              {track.cover_url ? (
                                <Image
                                  src={track.cover_url}
                                  alt={track.title}
                                  fill
                                  sizes="40px"
                                  className="object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-[var(--text-secondary)]">
                                  <Music2 className="h-4 w-4" />
                                </div>
                              )}

                              <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg-surface)]/70 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Play className="h-3.5 w-3.5 text-[var(--text-primary)] fill-current ml-0.5" />
                              </div>
                            </div>
                          </div>

                          {/* Title, Artist & Vibe Badge */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                                {track.title}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <p className="text-[11px] text-[var(--text-secondary)] truncate">
                                {track.artist}
                              </p>
                              {renderBadge(track.recommendationReason)}
                            </div>
                          </div>

                          {/* Actions: Add to Manual Queue & Dismiss */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                addToUserQueue(track, false);
                              }}
                              title="Pin to Up Next manual queue"
                              className="rounded-lg p-1 text-[var(--text-secondary)] opacity-0 group-hover:opacity-100 hover:text-[var(--text-primary)] hover:shadow-raised-sm active:shadow-sunken-sm transition-all cursor-pointer"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>

                            <span className="text-[11px] font-mono text-[var(--text-secondary)]">
                              {formatTime(track.duration)}
                            </span>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeFromDynamicPool(track.id, currentTrack);
                              }}
                              title="Dismiss recommendation"
                              className="rounded-lg p-1 text-[var(--text-secondary)] opacity-0 group-hover:opacity-100 hover:text-red-500 hover:shadow-raised-sm active:shadow-sunken-sm transition-all cursor-pointer"
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
            </>
          ) : (
            /* =========================================================================
               VIEW 2: CLASSIC YOUTUBE QUEUE MODE ACTIVE
               ========================================================================= */
            <div>
              {/* Action Controls Bar: Clear Queue & Shuffle Remaining */}
              <div className="flex items-center justify-between pb-3 gap-2">
                <span className="text-xs font-semibold text-[var(--text-secondary)]">
                  YouTube Queue
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={shuffleRemaining}
                    disabled={classicUpcomingTracks.length <= 1}
                    title="Shuffle remaining tracks in YouTube queue"
                    className="flex items-center gap-1.5 rounded-xl bg-[var(--bg-surface)] shadow-raised-sm active:shadow-sunken-sm px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                  >
                    <Shuffle className="h-3 w-3 text-[#E07A5F]" />
                    <span>Shuffle</span>
                  </button>

                  <button
                    onClick={clearQueue}
                    disabled={classicUpcomingTracks.length === 0}
                    title="Clear upcoming tracks from queue"
                    className="flex items-center gap-1.5 rounded-xl bg-[var(--bg-surface)] shadow-raised-sm active:shadow-sunken-sm px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-red-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>Clear</span>
                  </button>
                </div>
              </div>

              {/* Classic Section Header */}
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2.5">
                <div className="flex items-center gap-2">
                  <span>Up Next (YouTube Radio)</span>
                  {isAutoQueueLoading && (
                    <span className="flex items-center gap-1 normal-case text-[11px] font-medium text-[var(--text-secondary)] bg-[var(--bg-surface)] shadow-sunken-sm px-2.5 py-0.5 rounded-full">
                      <Loader2 className="h-3 w-3 animate-spin text-[#E07A5F]" />
                      Loading YouTube related...
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-mono text-[var(--text-secondary)] font-normal">
                  {classicUpcomingTracks.length} upcoming
                </span>
              </div>

              {classicUpcomingTracks.length === 0 ? (
                <div className="rounded-2xl bg-[var(--bg-surface)] shadow-sunken-sm p-6 text-center">
                  <Music2 className="h-6 w-6 text-[var(--text-secondary)] mx-auto mb-2" />
                  <p className="text-xs font-semibold text-[var(--text-primary)]">
                    YouTube Queue is empty
                  </p>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                    Playing songs will automatically load generic YouTube related radio recommendations.
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {classicUpcomingTracks.map((track, localIdx) => {
                    const globalIdx = upcomingStartIndex + localIdx;
                    const isBeingDragged = draggedClassicIndex === localIdx;

                    return (
                      <div
                        key={`classic-queue-${track.id}-${globalIdx}`}
                        draggable
                        onDragStart={(e) => handleClassicDragStart(e, localIdx)}
                        onDragOver={handleUserDragOver}
                        onDrop={(e) => handleClassicDrop(e, localIdx)}
                        className={`group flex items-center justify-between gap-3 rounded-xl p-2.5 transition-all duration-150 cursor-pointer ${
                          isBeingDragged
                            ? "opacity-40 shadow-sunken-sm"
                            : "hover:shadow-raised-sm active:shadow-sunken-sm"
                        }`}
                        onClick={() => playQueueIndex(globalIdx)}
                      >
                        {/* Drag Handle & Position Index */}
                        <div className="flex items-center gap-2.5 shrink-0">
                          <span
                            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-grab active:cursor-grabbing p-0.5"
                            title="Drag to reorder"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <GripVertical className="h-3.5 w-3.5" />
                          </span>

                          <span className="w-4 text-center text-xs font-mono text-[var(--text-secondary)]">
                            {localIdx + 1}
                          </span>

                          {/* Thumbnail */}
                          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-[var(--bg-surface)] shadow-sunken-sm">
                            {track.cover_url ? (
                              <Image
                                src={track.cover_url}
                                alt={track.title}
                                fill
                                sizes="40px"
                                className="object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[var(--text-secondary)]">
                                <Music2 className="h-4 w-4" />
                              </div>
                            )}

                            {/* Hover Play Icon Overlay */}
                            <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg-surface)]/70 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Play className="h-4 w-4 text-[var(--text-primary)] fill-current ml-0.5" />
                            </div>
                          </div>
                        </div>

                        {/* Title & Artist */}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-[var(--text-primary)] truncate transition-colors">
                            {track.title}
                          </p>
                          <p className="text-[11px] text-[var(--text-secondary)] truncate mt-0.5">
                            {track.artist}
                          </p>
                        </div>

                        {/* Duration & Remove Action */}
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] font-mono text-[var(--text-secondary)]">
                            {formatTime(track.duration)}
                          </span>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFromQueue(globalIdx);
                            }}
                            title="Remove from queue"
                            className="rounded-lg p-1 text-[var(--text-secondary)] opacity-0 group-hover:opacity-100 hover:text-red-500 hover:shadow-raised-sm active:shadow-sunken-sm transition-all cursor-pointer"
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
          )}
        </div>
      </aside>
    </>
  );
}

export default QueueDrawer;
