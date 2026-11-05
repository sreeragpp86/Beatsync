"use client";

import Image from "next/image";
import { Play, Pause, Music2 } from "lucide-react";
import { Track } from "@/types/track";
import { useAudioStore } from "@/stores/useAudioStore";
import { LikeButton } from "@/components/LikeButton";

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
      className={`group relative flex flex-col justify-between rounded-2xl p-3.5 cursor-pointer transition-all duration-200 select-none bg-[var(--bg-surface)] text-[var(--text-primary)] ${
        isActive
          ? "shadow-raised-sm ring-1 ring-[var(--text-secondary)]/20"
          : "hover:shadow-raised-sm active:shadow-sunken-sm"
      }`}
    >
      <div>
        {/* Cover Artwork Container */}
        <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-[var(--bg-surface)] shadow-sunken-sm">
          {track.cover_url ? (
            <Image
              src={track.cover_url}
              alt={track.title}
              fill
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[var(--text-secondary)]">
              <Music2 className="h-10 w-10" />
            </div>
          )}

          {/* Tactile Neomorphic Play Button on Hover */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleClick();
            }}
            aria-label={isTrackPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
            className={`absolute bottom-2.5 right-2.5 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--bg-surface)] text-[var(--text-primary)] transition-all duration-200 cursor-pointer z-10 ${
              isTrackPlaying
                ? "shadow-sunken opacity-100 translate-y-0"
                : "shadow-raised opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 hover:scale-105 active:shadow-sunken"
            }`}
          >
            {isTrackPlaying ? (
              <Pause className="h-5 w-5 fill-current" />
            ) : (
              <Play className="h-5 w-5 fill-current ml-0.5" />
            )}
          </button>
        </div>

        {/* Title & Artist & Like Button */}
        <div className="mt-3 flex items-start justify-between gap-1.5">
          <div className="min-w-0 flex-1">
            <p
              className={`text-sm font-semibold truncate transition-colors ${
                isActive ? "font-bold text-[var(--text-primary)]" : "text-[var(--text-primary)]"
              }`}
              title={track.title}
            >
              {track.title}
            </p>
            <p
              className="text-xs text-[var(--text-secondary)] truncate mt-0.5 hover:underline"
              title={track.artist}
            >
              {track.artist}
            </p>
          </div>
          <div className="shrink-0 -mr-1 -mt-0.5">
            <LikeButton track={track} trackId={track.id} size={15} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default TrackCard;
