"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Heart,
  Play,
  Pause,
  Compass,
  Loader2,
  Music2,
  List,
  LayoutGrid,
} from "lucide-react";
import { getTracks } from "@/lib/tracks";
import { Track } from "@/types/track";
import { useAudioStore } from "@/stores/useAudioStore";
import { useLikesStore } from "@/stores/useLikesStore";
import { Navbar } from "@/components/Navbar";
import { Sidebar } from "@/components/Sidebar";
import { TrackTable } from "@/components/TrackTable";
import { TrackCard } from "@/components/TrackCard";

export default function LikedSongsPage() {
  const { currentTrack, isPlaying, setQueue, togglePlay } = useAudioStore();
  const { likedTrackIds, syncLikes } = useLikesStore();

  const [allTracks, setAllTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  // Load catalog and sync likes
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
        console.warn("[SoundWave Liked] Failed to fetch tracks:", err);
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

  // Filter for tracks that are liked
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
    <div className="flex flex-col min-h-full bg-zinc-950 text-zinc-100 font-sans">
      {/* Top Navbar */}
      <Navbar />

      {/* Main Layout Area */}
      <div className="flex flex-1">
        {/* Sidebar */}
        <Sidebar />

        {/* Content Area */}
        <main className="flex-1 p-4 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
          {/* Hero Header Section */}
          <section className="relative overflow-hidden rounded-2xl border border-zinc-800/80 bg-gradient-to-br from-rose-950/40 via-zinc-900 to-zinc-950 p-6 md:p-8 shadow-2xl">
            {/* Ambient Lighting Gradients */}
            <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-rose-500/15 blur-3xl pointer-events-none" />
            <div className="absolute -left-20 -bottom-20 h-72 w-72 rounded-full bg-violet-600/15 blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-6">
              {/* Big Heart Badge */}
              <div className="flex h-24 w-24 sm:h-32 sm:w-32 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-rose-700 text-white shadow-xl shadow-rose-500/20">
                <Heart className="h-12 w-12 sm:h-16 sm:w-16 fill-white drop-shadow-md" />
              </div>

              {/* Title & Stats */}
              <div className="flex-1 min-w-0">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/15 px-3 py-1 text-xs font-semibold text-rose-400 border border-rose-500/30 backdrop-blur-sm">
                  Playlist
                </span>
                <h1 className="mt-2 text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-zinc-100">
                  Liked Songs
                </h1>
                <p className="mt-2 text-sm text-zinc-400">
                  {isLoading
                    ? "Loading your favorites..."
                    : `${likedTracks.length} ${
                        likedTracks.length === 1 ? "song" : "songs"
                      } saved to your collection`}
                </p>

                {/* Actions */}
                {likedTracks.length > 0 && (
                  <div className="mt-5 flex items-center gap-3">
                    <button
                      onClick={handlePlayAll}
                      className="flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 shadow-lg shadow-emerald-500/25 transition-all hover:bg-emerald-400 active:scale-95 cursor-pointer"
                    >
                      {isCurrentTrackInLiked && isPlaying ? (
                        <>
                          <Pause className="h-4 w-4 fill-zinc-950" />
                          Pause
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 fill-zinc-950 ml-0.5" />
                          Play All
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Track List Section */}
          <section className="space-y-4">
            {/* View Switcher Header */}
            {likedTracks.length > 0 && (
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">
                  Tracks
                </h2>

                <div className="flex items-center rounded-lg border border-zinc-800 bg-zinc-900/80 p-0.5">
                  <button
                    onClick={() => setViewMode("list")}
                    aria-label="List view"
                    className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                      viewMode === "list"
                        ? "bg-zinc-800 text-emerald-400 shadow-sm"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <List className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setViewMode("grid")}
                    aria-label="Grid view"
                    className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                      viewMode === "grid"
                        ? "bg-zinc-800 text-emerald-400 shadow-sm"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {isLoading ? (
              <div className="flex h-56 flex-col items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/30 gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-rose-500" />
                <span className="text-sm text-zinc-400">Loading your favorites...</span>
              </div>
            ) : likedTracks.length === 0 ? (
              /* Empty State */
              <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/20 p-8 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 mb-3.5">
                  <Heart className="h-7 w-7" />
                </div>
                <h3 className="text-base font-semibold text-zinc-200">
                  No liked songs yet
                </h3>
                <p className="text-xs text-zinc-400 mt-1.5 max-w-sm leading-relaxed">
                  Songs you like by tapping the heart icon anywhere in SoundWave will be saved here for quick playback.
                </p>
                <Link
                  href="/"
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-semibold text-zinc-950 shadow-md shadow-emerald-500/20 hover:bg-emerald-400 transition-all cursor-pointer"
                >
                  <Compass className="h-4 w-4" />
                  <span>Explore Music</span>
                </Link>
              </div>
            ) : viewMode === "list" ? (
              /* List Mode */
              <TrackTable
                tracks={likedTracks}
                allTracks={likedTracks}
                onPlay={(_, index) => setQueue(likedTracks, index)}
              />
            ) : (
              /* Grid Mode */
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {likedTracks.map((track, index) => (
                  <TrackCard
                    key={track.id}
                    track={track}
                    allTracks={likedTracks}
                    onPlay={() => setQueue(likedTracks, index)}
                  />
                ))}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
