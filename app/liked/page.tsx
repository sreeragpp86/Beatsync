"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Heart,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Compass,
} from "lucide-react";
import { getTracks } from "@/lib/tracks";
import { Track } from "@/types/track";
import { useAudioStore } from "@/stores/useAudioStore";
import { useLikesStore } from "@/stores/useLikesStore";
import { TrackTable } from "@/components/TrackTable";

export default function LikedSongsPage() {
  const { currentTrack, isPlaying, setQueue, togglePlay } = useAudioStore();
  const { likedTrackIds, syncLikes } = useLikesStore();

  const [allTracks, setAllTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    syncLikes();

    getTracks()
      .then((data) => {
        if (mounted) {
          setAllTracks(data);
        }
      })
      .catch((err) => {
        console.warn("[BeatSync Liked] Failed to fetch tracks:", err);
      })
      .finally(() => {
        if (mounted) {
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [syncLikes]);

  const likedTracks = useMemo(() => {
    return allTracks.filter((track) => likedTrackIds.includes(track.id));
  }, [allTracks, likedTrackIds]);

  const isCurrentTrackInLiked = Boolean(
    currentTrack && likedTracks.some((t) => t.id === currentTrack.id)
  );

  const handlePlayAll = () => {
    if (likedTracks.length === 0) return;

    if (isCurrentTrackInLiked) {
      togglePlay();
    } else {
      setQueue(likedTracks, 0);
    }
  };

  return (
    <div className="flex flex-col min-h-full select-none">
      {/* Sticky Top Bar with Back/Forward */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 bg-[#121212]/95 backdrop-blur-md border-b border-[#282828]/50">
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.history.back()}
            aria-label="Go back"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0a0a0a]/80 text-[#B3B3B3] hover:text-white transition-colors cursor-pointer"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => window.history.forward()}
            aria-label="Go forward"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0a0a0a]/80 text-[#B3B3B3] hover:text-white transition-colors cursor-pointer"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <Link
          href="/"
          className="text-xs font-bold text-[#B3B3B3] hover:text-white transition-colors"
        >
          Explore All
        </Link>
      </header>

      {/* Spotify Liked Songs Hero Header */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#5038a0] via-[#201c40] to-[#121212] px-6 pt-10 pb-6">
        <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-end gap-6">
          {/* Big Gradient Heart Box */}
          <div className="flex h-44 w-44 sm:h-52 sm:w-52 shrink-0 items-center justify-center rounded bg-gradient-to-br from-indigo-600 via-purple-600 to-rose-400 text-white shadow-2xl">
            <Heart className="h-20 w-20 fill-white drop-shadow-lg" />
          </div>

          {/* Metadata */}
          <div className="flex-1 text-center sm:text-left min-w-0">
            <span className="text-xs font-bold uppercase tracking-wider text-white">
              Playlist
            </span>
            <h1 className="mt-2 text-3xl sm:text-5xl lg:text-7xl font-extrabold text-white tracking-tight">
              Liked Songs
            </h1>
            <p className="mt-3 text-sm text-[#B3B3B3]">
              <span className="font-bold text-white">BeatSync User</span> •{" "}
              {isLoading
                ? "Loading..."
                : `${likedTracks.length} ${
                    likedTracks.length === 1 ? "song" : "songs"
                  }`}
            </p>
          </div>
        </div>
      </section>

      {/* Content Area */}
      <div className="px-6 py-6 space-y-6">
        {/* Play Action Bar */}
        {likedTracks.length > 0 && (
          <div className="flex items-center gap-6">
            <button
              onClick={handlePlayAll}
              aria-label={isCurrentTrackInLiked && isPlaying ? "Pause" : "Play all"}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-[#1DB954] text-black shadow-xl hover:scale-105 active:scale-95 transition-transform cursor-pointer"
            >
              {isCurrentTrackInLiked && isPlaying ? (
                <Pause className="h-6 w-6 fill-black" />
              ) : (
                <Play className="h-6 w-6 fill-black ml-1" />
              )}
            </button>
          </div>
        )}

        {/* Tracks List / Table */}
        {isLoading ? (
          <div className="flex h-56 flex-col items-center justify-center gap-3 text-[#B3B3B3]">
            <Loader2 className="h-6 w-6 animate-spin text-[#1DB954]" />
            <span className="text-sm">Loading your favorites...</span>
          </div>
        ) : likedTracks.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#282828] text-[#B3B3B3] mb-4">
              <Heart className="h-8 w-8" />
            </div>
            <h3 className="text-2xl font-bold text-white">
              Songs you like will appear here
            </h3>
            <p className="text-sm text-[#B3B3B3] mt-2 max-w-sm">
              Save songs by tapping the heart icon anywhere in BeatSync.
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-bold text-black hover:scale-105 active:scale-95 transition-transform cursor-pointer"
            >
              <Compass className="h-4 w-4" />
              <span>Find songs</span>
            </Link>
          </div>
        ) : (
          <TrackTable
            tracks={likedTracks}
            allTracks={likedTracks}
            onPlay={(_, index) => setQueue(likedTracks, index)}
          />
        )}
      </div>
    </div>
  );
}
