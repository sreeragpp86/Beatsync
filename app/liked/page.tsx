"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Heart,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Compass,
  Loader2,
} from "lucide-react";
import { useAudioStore } from "@/stores/useAudioStore";
import { useLikesStore } from "@/stores/useLikesStore";
import { TrackTable } from "@/components/TrackTable";

function formatTotalDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "0 min";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSecs = seconds % 60;

  if (hours > 0) {
    return `${hours} hr ${minutes} min`;
  }
  return `${minutes} min ${remainingSecs} sec`;
}

export function LikedSongsContent() {
  const [mounted, setMounted] = useState(false);
  const { currentTrack, isPlaying, setQueue, togglePlay } = useAudioStore();
  const { likedTracks, syncLikes } = useLikesStore();

  useEffect(() => {
    setMounted(true);
    syncLikes();
  }, [syncLikes]);

  const tracks = useMemo(
    () => (mounted ? likedTracks : []),
    [mounted, likedTracks]
  );

  const isCurrentTrackInLiked = Boolean(
    currentTrack && tracks.some((t) => t.id === currentTrack.id)
  );

  const totalDuration = useMemo(() => {
    return tracks.reduce((acc, t) => acc + (t.duration || 0), 0);
  }, [tracks]);

  const handlePlayAll = () => {
    if (tracks.length === 0) return;

    if (isCurrentTrackInLiked) {
      togglePlay();
    } else {
      setQueue(tracks, 0);
    }
  };

  return (
    <div className="flex flex-col min-h-full select-none">
      {/* Sticky Top Bar with Back/Forward & Search Hub Navigation */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-3.5 py-2.5 sm:px-6 sm:py-4 bg-[#0c0c16]/95 backdrop-blur-xl border-b border-white/10 select-none">
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.history.back()}
            aria-label="Go back"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-[#B3B3B3] hover:text-white transition-all cursor-pointer"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => window.history.forward()}
            aria-label="Go forward"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-[#B3B3B3] hover:text-white transition-all cursor-pointer"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <Link
          href="/search"
          className="text-xs font-bold text-[#B3B3B3] hover:text-white transition-colors flex items-center gap-1.5 shrink-0"
        >
          <Compass className="h-4 w-4 text-[#1DB954]" />
          <span>Find Music</span>
        </Link>
      </header>

      {/* Spotify Liked Songs Hero Header with Violet-to-Black Gradient */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#4c1d95]/90 via-[#1e1035]/80 to-transparent px-4 sm:px-6 pt-6 sm:pt-10 pb-6 sm:pb-8 border-b border-white/5">
        <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-end gap-5 sm:gap-8">
          {/* Large Heart Badge */}
          <div className="relative group flex h-32 w-32 sm:h-52 sm:w-52 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#4c1d95] via-[#7c3aed] to-[#ec4899] text-white shadow-2xl border border-white/20">
            <Heart className="h-16 w-16 sm:h-24 sm:w-24 fill-white text-white drop-shadow-2xl transition-transform duration-300 group-hover:scale-110" />
            <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          </div>

          {/* Playlist Metadata */}
          <div className="flex-1 text-center sm:text-left min-w-0">
            <span className="text-xs font-extrabold uppercase tracking-widest text-white/80">
              Playlist
            </span>
            <h1 className="mt-2 text-3xl sm:text-5xl lg:text-7xl font-black text-white tracking-tight drop-shadow-md">
              Liked Songs
            </h1>
            <p className="mt-4 text-sm text-[#B3B3B3] flex flex-wrap items-center justify-center sm:justify-start gap-1.5">
              <span className="font-bold text-white hover:underline cursor-pointer">
                BeatSync User
              </span>
              <span>•</span>
              <span className="font-medium text-white">
                {!mounted
                  ? "Loading..."
                  : `${tracks.length} ${tracks.length === 1 ? "song" : "songs"}`}
              </span>
              {mounted && tracks.length > 0 && (
                <>
                  <span>•</span>
                  <span>{formatTotalDuration(totalDuration)}</span>
                </>
              )}
            </p>
          </div>
        </div>
      </section>

      {/* Content Area */}
      <div className="px-6 py-6 space-y-6 flex-1">
        {/* Play Action Bar (Circular Emerald "Play All" Button) */}
        {mounted && tracks.length > 0 && (
          <div className="flex items-center gap-6">
            <button
              onClick={handlePlayAll}
              aria-label={
                isCurrentTrackInLiked && isPlaying
                  ? "Pause liked songs"
                  : "Play all liked songs"
              }
              title={
                isCurrentTrackInLiked && isPlaying
                  ? "Pause liked songs"
                  : "Play all liked songs"
              }
              className="flex h-14 w-14 items-center justify-center rounded-full bg-[#1DB954] text-black shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer hover:bg-[#1ed760]"
            >
              {isCurrentTrackInLiked && isPlaying ? (
                <Pause className="h-6 w-6 fill-black text-black" />
              ) : (
                <Play className="h-6 w-6 fill-black text-black ml-1" />
              )}
            </button>
          </div>
        )}

        {/* Tracks List / Table */}
        {!mounted ? (
          <div className="flex h-56 flex-col items-center justify-center gap-3 text-[#B3B3B3]">
            <Loader2 className="h-7 w-7 animate-spin text-[#1DB954]" />
            <span className="text-sm font-medium">Loading your liked songs...</span>
          </div>
        ) : tracks.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/5 border border-white/10 text-[#B3B3B3] mb-5 shadow-inner">
              <Heart className="h-10 w-10 text-[#B3B3B3]" />
            </div>
            <h3 className="text-2xl font-bold text-white">
              No liked tracks yet
            </h3>
            <p className="text-sm text-[#B3B3B3] mt-2 max-w-sm">
              Save tracks to your library by tapping the heart icon on any song card, row, or in the player dock.
            </p>
            <Link
              href="/search"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-bold text-black hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-lg hover:bg-neutral-100"
            >
              <Compass className="h-4 w-4" />
              <span>Explore Music</span>
            </Link>
          </div>
        ) : (
          <TrackTable
            tracks={tracks}
            allTracks={tracks}
            onPlay={(_, index) => setQueue(tracks, index)}
          />
        )}
      </div>
    </div>
  );
}

export default function LikedSongsPage() {
  return <LikedSongsContent />;
}
