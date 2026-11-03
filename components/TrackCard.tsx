"use client";

import Image from "next/image";
import { Play, Pause, Music2 } from "lucide-react";
import { Track } from "@/types/track";
import { useAudioStore } from "@/stores/useAudioStore";
import { LikeButton } from "@/components/LikeButton";

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export interface TrackCardProps {
  track: Track;
  allTracks?: Track[];
  onPlay?: (track: Track) => void;
}

export function TrackCard({ track, allTracks = [], onPlay }: TrackCardProps) {
  const { currentTrack, isPlaying, togglePlay, playWithAutoQueue } =
    useAudioStore();

  const isActive = currentTrack?.id === track.id;
  const isTrackPlaying = isActive && isPlaying;

  const handleClick = () => {
    if (onPlay) {
      onPlay(track);
    } else if (isActive) {
      togglePlay();
    } else {
      playWithAutoQueue(track, allTracks.length > 0 ? allTracks : [track]);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`group relative flex flex-col justify-between rounded-xl border p-4 cursor-pointer transition-all duration-200 ${
        isActive
          ? "border-emerald-500/60 bg-zinc-900/90 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/30"
          : "border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/80 hover:shadow-md"
      }`}
    >
      <div className="flex items-start gap-3.5">
        {/* Cover Artwork */}
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-zinc-800 shadow-inner">
          {track.cover_url ? (
            <Image
              src={track.cover_url}
              alt={track.title}
              fill
              sizes="64px"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-zinc-500">
              <Music2 className="h-6 w-6" />
            </div>
          )}

          {/* Hover Play / Waveform Overlay */}
          <div
            className={`absolute inset-0 flex items-center justify-center transition-opacity ${
              isTrackPlaying
                ? "bg-zinc-950/60 opacity-100"
                : "bg-zinc-950/40 opacity-0 group-hover:opacity-100"
            }`}
          >
            {isTrackPlaying ? (
              <Pause className="h-6 w-6 text-emerald-400 fill-emerald-400" />
            ) : (
              <Play className="h-6 w-6 text-white fill-white ml-0.5" />
            )}
          </div>
        </div>

        {/* Title, Artist, Album */}
        <div className="min-w-0 flex-1">
          <p
            className={`text-sm font-semibold truncate transition-colors ${
              isActive
                ? "text-emerald-400"
                : "text-zinc-100 group-hover:text-white"
            }`}
          >
            {track.title}
          </p>
          <p className="text-xs text-zinc-400 truncate mt-0.5">{track.artist}</p>
          {track.album && (
            <p className="text-[11px] text-zinc-500 truncate mt-0.5">
              {track.album}
            </p>
          )}
        </div>
      </div>

      {/* Card Bottom: Duration, Like Button, Play Button */}
      <div className="mt-4 flex items-center justify-between border-t border-zinc-800/60 pt-3">
        <div className="flex items-center gap-2">
          {isActive && (
            <div
              className="flex items-end gap-0.5 h-3.5"
              title={isPlaying ? "Playing" : "Paused"}
            >
              {isTrackPlaying ? (
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
          )}
          <span
            className={`text-xs font-mono ${
              isActive ? "text-emerald-400 font-medium" : "text-zinc-400"
            }`}
          >
            {formatTime(track.duration)}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Like Button */}
          <LikeButton trackId={track.id} size={16} />

          {/* Inline Play Action Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleClick();
            }}
            aria-label={
              isTrackPlaying ? `Pause ${track.title}` : `Play ${track.title}`
            }
            className={`flex h-8 w-8 items-center justify-center rounded-full transition-all cursor-pointer ${
              isActive
                ? "bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20"
                : "bg-zinc-800 text-zinc-300 hover:bg-emerald-500 hover:text-zinc-950 hover:scale-105"
            }`}
          >
            {isTrackPlaying ? (
              <Pause className="h-4 w-4 fill-current" />
            ) : (
              <Play className="h-4 w-4 fill-current ml-0.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default TrackCard;
