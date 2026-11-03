"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Play,
  Pause,
  Music2,
  ListMusic,
  Loader2,
  LayoutGrid,
  List,
} from "lucide-react";
import { Track } from "@/types/track";
import { useAudioStore } from "@/stores/useAudioStore";
import { useLikesStore } from "@/stores/useLikesStore";
import { Navbar } from "@/components/Navbar";
import { Sidebar } from "@/components/Sidebar";
import { SearchBar } from "@/components/SearchBar";
import { TrackCard } from "@/components/TrackCard";
import { TrackTable } from "@/components/TrackTable";

export default function Home() {
  const {
    currentTrack,
    isPlaying,
    setQueue,
    playWithAutoQueue,
    togglePlay,
  } = useAudioStore();

  const { syncLikes } = useLikesStore();

  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    setIsSearching(true);

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setTracks(data.tracks || []);
      } else {
        console.warn("[SoundWave] Search request returned status:", res.status);
      }
    } catch (err) {
      console.warn("[SoundWave] Search request failed:", err);
    } finally {
      setIsSearching(false);
      setIsLoading(false);
    }
  }, []);

  const handleResetSearch = () => {
    handleSearch("");
  };

  // Initial load: sync remote likes and fetch catalog
  useEffect(() => {
    syncLikes();
    handleSearch("");
  }, [syncLikes, handleSearch]);

  const filteredTracks = tracks;

  const handleTrackClick = (track: Track) => {
    if (currentTrack?.id === track.id) {
      togglePlay();
    } else {
      playWithAutoQueue(track, tracks);
    }
  };

  const handlePlayFeatured = () => {
    if (filteredTracks.length > 0) {
      if (!currentTrack) {
        playWithAutoQueue(filteredTracks[0], tracks);
      } else {
        togglePlay();
      }
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
          {/* Hero Section with ambient lighting */}
          <section className="relative overflow-hidden rounded-2xl border border-zinc-800/80 bg-gradient-to-br from-zinc-900/90 via-zinc-950 to-zinc-900 p-6 md:p-8 shadow-2xl">
            {/* Ambient Lighting Gradients */}
            <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />
            <div className="absolute -left-20 -bottom-20 h-72 w-72 rounded-full bg-violet-600/15 blur-3xl pointer-events-none" />

            <div className="relative z-10 max-w-2xl">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/20 backdrop-blur-sm">
                <Music2 className="h-3.5 w-3.5" />
                Featured Catalog
              </span>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-zinc-100 sm:text-4xl">
                Experience music with zero friction.
              </h1>
              <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                Stream curated masterworks with our reactive Zustand audio engine, HTML5 singleton, and Supabase data layer.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  onClick={handlePlayFeatured}
                  disabled={filteredTracks.length === 0}
                  className="flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 shadow-lg shadow-emerald-500/25 transition-all hover:bg-emerald-400 active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {isPlaying ? (
                    <>
                      <Pause className="h-4 w-4 fill-zinc-950" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 fill-zinc-950" />
                      Play Featured
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    if (filteredTracks.length > 0) setQueue(filteredTracks, 0);
                  }}
                  disabled={filteredTracks.length === 0}
                  className="flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800/80 px-4 py-2.5 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-800 hover:text-white disabled:opacity-50 cursor-pointer"
                >
                  <ListMusic className="h-4 w-4 text-violet-400" />
                  Load Entire Queue
                </button>
              </div>
            </div>
          </section>

          {/* Search Bar & View Toggle */}
          <section className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <SearchBar
              initialValue={searchQuery}
              onSearch={handleSearch}
              isLoading={isSearching}
              className="flex-1 max-w-md"
            />

            <div className="flex items-center justify-between sm:justify-end gap-3">
              <span className="text-xs text-zinc-400 font-mono">
                {isLoading || isSearching
                  ? "Searching catalog..."
                  : searchQuery
                  ? `${filteredTracks.length} of ${tracks.length} tracks`
                  : `${tracks.length} tracks`}
              </span>

              {/* View Switcher: Grid vs List */}
              <div className="flex items-center rounded-lg border border-zinc-800 bg-zinc-900/80 p-0.5">
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
              </div>
            </div>
          </section>

          {/* Track Discovery Catalog */}
          <section>
            {isLoading ? (
              <div className="flex h-56 flex-col items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/30 gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
                <span className="text-sm text-zinc-400">Loading music catalog...</span>
              </div>
            ) : filteredTracks.length === 0 ? (
              <div className="flex h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/20 p-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800/80 text-zinc-500 mb-3">
                  <Music2 className="h-6 w-6" />
                </div>
                {searchQuery ? (
                  <>
                    <p className="text-sm font-medium text-zinc-300">
                      No tracks found for &ldquo;{searchQuery}&rdquo;
                    </p>
                    <p className="text-xs text-zinc-500 mt-1 max-w-sm">
                      We couldn&apos;t find any songs matching your query. Try searching by another artist, title, or album.
                    </p>
                    <button
                      onClick={handleResetSearch}
                      className="mt-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-4 py-2 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-all cursor-pointer"
                    >
                      Reset Search
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium text-zinc-300">
                      No tracks available
                    </p>
                    <p className="text-xs text-zinc-500 mt-1 max-w-sm">
                      Check your connection or reload the catalog.
                    </p>
                    <button
                      onClick={handleResetSearch}
                      className="mt-4 rounded-xl bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 transition-all cursor-pointer"
                    >
                      Reload Catalog
                    </button>
                  </>
                )}
              </div>
            ) : viewMode === "grid" ? (
              /* GRID VIEW */
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredTracks.map((track) => (
                  <TrackCard
                    key={track.id}
                    track={track}
                    allTracks={tracks}
                    onPlay={() => handleTrackClick(track)}
                  />
                ))}
              </div>
            ) : (
              /* LIST VIEW */
              <TrackTable
                tracks={filteredTracks}
                allTracks={tracks}
                onPlay={(track) => handleTrackClick(track)}
              />
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
