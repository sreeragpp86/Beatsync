"use client";

import Image from "next/image";
import { Play, Pause, Clock, Music2 } from "lucide-react";
import { Track } from "@/types/track";
import { useAudioStore } from "@/stores/useAudioStore";
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
    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/30">
      {/* Table Header */}
      <div className="grid grid-cols-12 gap-2 border-b border-zinc-800/80 px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
        <div className="col-span-1 text-center">#</div>
        <div className="col-span-6 sm:col-span-5">Title & Artist</div>
        <div className="hidden sm:block sm:col-span-4">Album</div>
        <div className="col-span-5 sm:col-span-2 text-right flex items-center justify-end gap-1">
          <Clock className="h-3 w-3" />
          <span>Duration</span>
        </div>
      </div>

      {/* Track Rows */}
      <div className="divide-y divide-zinc-800/50">
        {tracks.map((track, index) => {
          const isActive = currentTrack?.id === track.id;
          const isTrackPlaying = isActive && isPlaying;

          return (
            <div
              key={track.id}
              onClick={() => handleRowClick(track, index)}
              className={`group grid grid-cols-12 items-center gap-2 px-4 py-3 cursor-pointer transition-colors ${
                isActive
                  ? "bg-emerald-500/10 text-zinc-100"
                  : "hover:bg-zinc-800/40 text-zinc-300"
              }`}
            >
              {/* Track Index or Playing Waveform */}
              <div className="col-span-1 text-center">
                {isTrackPlaying ? (
                  <div className="flex items-end justify-center gap-0.5 h-3.5 mx-auto">
                    <span className="w-0.5 bg-emerald-400 rounded-full animate-waveform-1" />
                    <span className="w-0.5 bg-emerald-400 rounded-full animate-waveform-2" />
                    <span className="w-0.5 bg-emerald-400 rounded-full animate-waveform-3" />
                    <span className="w-0.5 bg-emerald-400 rounded-full animate-waveform-4" />
                  </div>
                ) : (
                  <div className="relative flex items-center justify-center">
                    <span
                      className={`text-xs font-mono group-hover:opacity-0 ${
                        isActive ? "text-emerald-400 font-bold" : "text-zinc-500"
                      }`}
                    >
                      {index + 1}
                    </span>
                    <Play className="absolute h-3.5 w-3.5 text-zinc-100 fill-zinc-100 opacity-0 group-hover:opacity-100 transition-opacity ml-0.5" />
                  </div>
                )}
              </div>

              {/* Cover Art + Title + Artist */}
              <div className="col-span-6 sm:col-span-5 flex items-center gap-3 min-w-0">
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
                </div>
                <div className="min-w-0 flex-1 truncate">
                  <p
                    className={`text-sm font-medium truncate ${
                      isActive
                        ? "text-emerald-400"
                        : "text-zinc-100 group-hover:text-white"
                    }`}
                  >
                    {track.title}
                  </p>
                  <p className="text-xs text-zinc-400 truncate">
                    {track.artist}
                  </p>
                </div>
              </div>

              {/* Album */}
              <div className="hidden sm:block sm:col-span-4 min-w-0 truncate text-xs text-zinc-400">
                {track.album || "—"}
              </div>

              {/* Like Button, Duration & Play Action */}
              <div className="col-span-5 sm:col-span-2 flex items-center justify-end gap-2 text-right">
                <LikeButton trackId={track.id} size={15} />

                <span
                  className={`text-xs font-mono ${
                    isActive ? "text-emerald-400 font-medium" : "text-zinc-400"
                  }`}
                >
                  {formatTime(track.duration)}
                </span>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRowClick(track, index);
                  }}
                  className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors cursor-pointer ${
                    isActive
                      ? "bg-emerald-500 text-zinc-950"
                      : "bg-zinc-800 text-zinc-400 opacity-0 group-hover:opacity-100 hover:bg-emerald-500 hover:text-zinc-950"
                  }`}
                  aria-label={
                    isTrackPlaying
                      ? `Pause ${track.title}`
                      : `Play ${track.title}`
                  }
                >
                  {isTrackPlaying ? (
                    <Pause className="h-3.5 w-3.5 fill-current" />
                  ) : (
                    <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default TrackTable;
