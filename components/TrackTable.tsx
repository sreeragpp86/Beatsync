"use client";

import Image from "next/image";
import { Play, Pause, Clock, Music2, Plus } from "lucide-react";
import { Track } from "@/types/track";
import { useAudioStore } from "@/stores/useAudioStore";
import { useDynamicQueueStore } from "@/stores/useDynamicQueueStore";
import { LikeButton } from "@/components/LikeButton";

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export interface TrackTableProps {
  tracks: Track[];
  allTracks?: Track[];
  onPlay?: (track: Track, index: number) => void;
}

export function TrackTable({
  tracks,
  allTracks = [],
  onPlay,
}: TrackTableProps) {
  const { currentTrack, isPlaying, togglePlay, playWithAutoQueue } =
    useAudioStore();

  const handleRowClick = (track: Track, index: number) => {
    if (onPlay) {
      onPlay(track, index);
    } else if (currentTrack?.id === track.id) {
      togglePlay();
    } else {
      playWithAutoQueue(track, allTracks.length > 0 ? allTracks : tracks);
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl select-none">
      {/* Table Header (No harsh borders) */}
      <div className="grid grid-cols-12 gap-2 sm:gap-4 px-3 sm:px-5 py-3 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
        <div className="col-span-1 text-center">#</div>
        <div className="col-span-7 sm:col-span-5">Title</div>
        <div className="hidden sm:block sm:col-span-4">Album</div>
        <div className="col-span-4 sm:col-span-2 text-right flex items-center justify-end gap-1.5 pr-2">
          <Clock className="h-3.5 w-3.5" />
        </div>
      </div>

      {/* Track Rows (Neomorphic Soft Plates on hover / selection) */}
      <div className="space-y-1.5 px-1 py-1">
        {tracks.map((track, index) => {
          const isActive = currentTrack?.id === track.id;
          const isTrackPlaying = isActive && isPlaying;

          return (
            <div
              key={track.id}
              onClick={() => handleRowClick(track, index)}
              className={`group grid grid-cols-12 items-center gap-2 sm:gap-4 px-3 sm:px-4 py-2.5 rounded-xl cursor-pointer transition-all duration-200 border-none ${
                isActive
                  ? "bg-[var(--bg-surface)] shadow-sunken-sm text-[var(--text-primary)]"
                  : "bg-transparent hover:bg-[var(--bg-surface)] hover:shadow-raised-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {/* Track Index or Play Icon */}
              <div className="col-span-1 text-center">
                <div className="relative flex items-center justify-center">
                  <span
                    className={`text-xs font-mono group-hover:opacity-0 transition-opacity ${
                      isActive ? "text-[var(--text-primary)] font-bold" : "text-[var(--text-secondary)]"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    {isTrackPlaying ? (
                      <Pause className="h-3.5 w-3.5 text-[var(--text-primary)] fill-current" />
                    ) : (
                      <Play className="h-3.5 w-3.5 text-[var(--text-primary)] fill-current ml-0.5" />
                    )}
                  </div>
                </div>
              </div>

              {/* Cover Art + Title + Artist */}
              <div className="col-span-7 sm:col-span-5 flex items-center gap-3 min-w-0">
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-[var(--bg-surface)] shadow-raised-sm">
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
                </div>
                <div className="min-w-0 flex-1 truncate">
                  <p
                    className={`text-sm font-semibold truncate ${
                      isActive ? "text-[var(--text-primary)]" : "text-[var(--text-primary)]"
                    }`}
                  >
                    {track.title}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] truncate mt-0.5">
                    {track.artist}
                  </p>
                </div>
              </div>

              {/* Album */}
              <div className="hidden sm:block sm:col-span-4 min-w-0 truncate text-xs text-[var(--text-secondary)]">
                {track.album || "—"}
              </div>

              {/* Like Button, Add to Queue & Duration */}
              <div className="col-span-4 sm:col-span-2 flex items-center justify-end gap-2 sm:gap-2.5 text-right pr-1 sm:pr-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    useDynamicQueueStore.getState().addToUserQueue(track);
                  }}
                  title="Add to queue"
                  className="p-1 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:shadow-raised-sm active:shadow-sunken-sm transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>

                <LikeButton track={track} trackId={track.id} size={15} />

                <span className="text-xs font-mono tabular-nums text-[var(--text-secondary)]">
                  {formatTime(track.duration)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default TrackTable;
