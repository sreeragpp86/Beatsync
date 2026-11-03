"use client";

import Image from "next/image";
import { Play, Pause, Music2 } from "lucide-react";
import { Track } from "@/types/track";
import { useAudioStore } from "@/stores/useAudioStore";

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
      className={`group relative flex flex-col justify-between rounded-md p-4 cursor-pointer transition-all duration-300 select-none ${
        isActive
          ? "bg-[#282828] shadow-xl"
          : "bg-[#181818] hover:bg-[#282828] shadow-md hover:shadow-xl"
      }`}
    >
      <div>
        {/* Cover Artwork Container */}
        <div className="relative aspect-square w-full overflow-hidden rounded-md bg-[#282828] shadow-md">
          {track.cover_url ? (
            <Image
              src={track.cover_url}
              alt={track.title}
              fill
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[#B3B3B3]">
              <Music2 className="h-10 w-10" />
            </div>
          )}

          {/* Floating Spotify Emerald Play Button on Hover */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleClick();
            }}
            aria-label={isTrackPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
            className={`absolute bottom-2 right-2 flex h-12 w-12 items-center justify-center rounded-full bg-[#1DB954] text-black shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer z-10 ${
              isTrackPlaying
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0"
            }`}
          >
            {isTrackPlaying ? (
              <Pause className="h-5 w-5 fill-black" />
            ) : (
              <Play className="h-5 w-5 fill-black ml-0.5" />
            )}
          </button>
        </div>

        {/* Title & Artist */}
        <div className="mt-3.5">
          <p
            className={`text-sm font-bold truncate transition-colors ${
              isActive ? "text-[#1DB954]" : "text-white group-hover:text-white"
            }`}
            title={track.title}
          >
            {track.title}
          </p>
          <p
            className="text-xs text-[#B3B3B3] truncate mt-1 hover:underline hover:text-white"
            title={track.artist}
          >
            {track.artist}
          </p>
        </div>
      </div>
    </div>
  );
}

export default TrackCard;
