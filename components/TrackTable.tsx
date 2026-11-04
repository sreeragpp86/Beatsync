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
    <div className="overflow-hidden rounded-md select-none">
      {/* Table Header */}
      <div className="grid grid-cols-12 gap-2 sm:gap-4 border-b border-[#282828] px-2 sm:px-4 py-2.5 text-xs font-semibold text-[#B3B3B3] uppercase tracking-wider">
        <div className="col-span-1 text-center">#</div>
        <div className="col-span-7 sm:col-span-5">Title</div>
        <div className="hidden sm:block sm:col-span-4">Album</div>
        <div className="col-span-4 sm:col-span-2 text-right flex items-center justify-end gap-1.5 pr-1 sm:pr-2">
          <Clock className="h-3.5 w-3.5" />
        </div>
      </div>

      {/* Track Rows */}
      <div className="mt-1 space-y-0.5">
        {tracks.map((track, index) => {
          const isActive = currentTrack?.id === track.id;
          const isTrackPlaying = isActive && isPlaying;

          return (
            <div
              key={track.id}
              onClick={() => handleRowClick(track, index)}
              className={`group grid grid-cols-12 items-center gap-2 sm:gap-4 px-2 sm:px-4 py-2 rounded-md cursor-pointer transition-colors ${
                isActive
                  ? "bg-[#282828] text-white"
                  : "hover:bg-[#282828]/60 text-[#B3B3B3] hover:text-white"
              }`}
            >
              {/* Track Index or Playing Indicator */}
              <div className="col-span-1 text-center">
                {isTrackPlaying ? (
                  <div className="flex items-end justify-center gap-0.5 h-3.5 mx-auto">
                    <span className="w-0.5 bg-[#1DB954] rounded-full animate-waveform-1" />
                    <span className="w-0.5 bg-[#1DB954] rounded-full animate-waveform-2" />
                    <span className="w-0.5 bg-[#1DB954] rounded-full animate-waveform-3" />
                    <span className="w-0.5 bg-[#1DB954] rounded-full animate-waveform-4" />
                  </div>
                ) : (
                  <div className="relative flex items-center justify-center">
                    <span
                      className={`text-sm font-mono group-hover:opacity-0 ${
                        isActive ? "text-[#1DB954] font-bold" : "text-[#B3B3B3]"
                      }`}
                    >
                      {index + 1}
                    </span>
                    <Play className="absolute h-3.5 w-3.5 text-white fill-white opacity-0 group-hover:opacity-100 transition-opacity ml-0.5" />
                  </div>
                )}
              </div>

              {/* Cover Art + Title + Artist */}
              <div className="col-span-7 sm:col-span-5 flex items-center gap-2.5 sm:gap-3.5 min-w-0">
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
                </div>
                <div className="min-w-0 flex-1 truncate">
                  <p
                    className={`text-sm font-medium truncate ${
                      isActive ? "text-[#1DB954]" : "text-white"
                    }`}
                  >
                    {track.title}
                  </p>
                  <p className="text-xs text-[#B3B3B3] truncate group-hover:text-white mt-0.5">
                    {track.artist}
                  </p>
                </div>
              </div>

              {/* Album */}
              <div className="hidden sm:block sm:col-span-4 min-w-0 truncate text-xs text-[#B3B3B3]">
                {track.album || "—"}
              </div>

              {/* Like Button & Duration */}
              <div className="col-span-4 sm:col-span-2 flex items-center justify-end gap-2 sm:gap-3 text-right pr-1 sm:pr-2">
                <LikeButton track={track} trackId={track.id} size={16} />

                <span
                  className={`text-xs font-mono tabular-nums ${
                    isActive ? "text-[#1DB954]" : "text-[#B3B3B3]"
                  }`}
                >
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
