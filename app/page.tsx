"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Image from "next/image";
import {
  Play,
  Pause,
  Radio,
  Library,
  Compass,
  CheckCircle2,
  AlertCircle,
  Headphones,
  Sparkles,
  Music2,
  ListMusic,
  Loader2,
  LayoutGrid,
  List,
  Clock,
  Heart,
} from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase";
import { useAudioStore } from "@/stores/useAudioStore";
import { useLikesStore } from "@/stores/useLikesStore";
import { SearchBar } from "@/components/SearchBar";
import { Track } from "@/types/track";

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function Home() {
  const {
    currentTrack,
    isPlaying,
    queueIndex,
    setQueue,
    togglePlay,
  } = useAudioStore();

  const { isLiked, toggleLike, syncLikes, likedTrackIds } = useLikesStore();

  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<"explore" | "library" | "radio">(
    "explore"
  );
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

  // Initial load: sync remote likes and fetch initial tracks
  useEffect(() => {
    syncLikes();
    handleSearch("");
  }, [syncLikes, handleSearch]);

  // Filter tracks by active tab (Explore vs Library)
  const filteredTracks = useMemo(() => {
    if (activeTab === "library") {
      return tracks.filter((t) => likedTrackIds.includes(t.id));
    }
    return tracks;
  }, [tracks, activeTab, likedTrackIds]);

  const handleTrackClick = (track: Track, index: number) => {
    if (currentTrack?.id === track.id) {
      togglePlay();
    } else {
      setQueue(filteredTracks, index);
    }
  };

  const handlePlayAll = () => {
    if (filteredTracks.length > 0) {
      if (!currentTrack) {
        setQueue(filteredTracks, 0);
      } else {
        togglePlay();
      }
    }
  };

  return (
    <div className="flex flex-col min-h-full bg-zinc-950 text-zinc-100 font-sans">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between border-b border-zinc-800/80 bg-zinc-950/80 px-4 md:px-8 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-violet-600 text-zinc-950 shadow-lg shadow-emerald-500/10">
            <Headphones className="h-5 w-5 text-zinc-950 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-zinc-100 via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
                SoundWave
              </span>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                MVP
              </span>
            </div>
            <p className="text-xs text-zinc-400">Stream in ultra-clean audio</p>
          </div>
        </div>

        {/* Supabase status badge */}
        <div className="flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/90 px-3 py-1.5 text-xs text-zinc-300">
          {isSupabaseConfigured ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Supabase Connected</span>
              <span className="sm:hidden">Connected</span>
            </>
          ) : (
            <>
              <AlertCircle className="h-3.5 w-3.5 text-violet-400" />
              <span className="text-zinc-400">
                Supabase:{" "}
                <span className="text-violet-300 font-mono">Mock Fallback</span>
              </span>
            </>
          )}
        </div>
      </header>

      {/* Main Layout Area */}
      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="hidden w-64 flex-col justify-between border-r border-zinc-800/80 bg-zinc-900/30 p-4 md:flex shrink-0">
          <div className="space-y-6">
            <div className="space-y-1">
              <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Discover
              </p>
              <button
                onClick={() => setActiveTab("explore")}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${
                  activeTab === "explore"
                    ? "bg-zinc-800 text-emerald-400 shadow-sm"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                }`}
              >
                <Compass className="h-4 w-4" />
                Explore
              </button>
              <button
                onClick={() => setActiveTab("radio")}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${
                  activeTab === "radio"
                    ? "bg-zinc-800 text-emerald-400 shadow-sm"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                }`}
              >
                <Radio className="h-4 w-4" />
                Radio
              </button>
              <button
                onClick={() => setActiveTab("library")}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${
                  activeTab === "library"
                    ? "bg-zinc-800 text-emerald-400 shadow-sm"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Library className="h-4 w-4" />
                  <span>Your Library</span>
                </div>
                {likedTrackIds.length > 0 && (
                  <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-mono font-semibold text-emerald-400">
                    {likedTrackIds.length}
                  </span>
                )}
              </button>
            </div>

            <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-3.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
                <Sparkles className="h-3.5 w-3.5 text-violet-400" />
                <span>Audio Engine Status</span>
              </div>
              <ul className="mt-2.5 space-y-1.5 text-[11px] text-zinc-400">
                <li className="flex items-center justify-between">
                  <span>HTML5 Audio Singleton</span>
                  <span className="text-emerald-400 font-mono">Active</span>
                </li>
                <li className="flex items-center justify-between">
                  <span>Available Tracks</span>
                  <span className="text-emerald-400 font-mono">
                    {tracks.length} tracks
                  </span>
                </li>
                <li className="flex items-center justify-between">
                  <span>Queue Position</span>
                  <span className="text-emerald-400 font-mono">
                    {queueIndex >= 0 ? `#${queueIndex + 1}` : "None"}
                  </span>
                </li>
                <li className="flex items-center justify-between">
                  <span>Playback State</span>
                  <span className="text-violet-400 font-mono">
                    {isPlaying ? "Playing" : "Paused"}
                  </span>
                </li>
              </ul>
            </div>
          </div>

          <div className="rounded-lg bg-zinc-900/80 p-3 text-xs text-zinc-400 border border-zinc-800">
            <p className="text-zinc-300 font-medium">Quick Tip</p>
            <p className="mt-1 text-[11px] leading-relaxed">
              Click any track to stream instantly. The persistent player bar at the bottom supports uninterrupted seeking and volume control.
            </p>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 p-4 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
          {/* Hero Section with ambient gradient */}
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
                  onClick={handlePlayAll}
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
                  className={`p-1.5 rounded-md transition-colors ${
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
                  className={`p-1.5 rounded-md transition-colors ${
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
                ) : activeTab === "library" ? (
                  <>
                    <p className="text-sm font-medium text-zinc-300">
                      Your library is empty
                    </p>
                    <p className="text-xs text-zinc-500 mt-1 max-w-sm">
                      You haven&apos;t liked any tracks yet. Click the heart icon on any track in Explore to add it to your library.
                    </p>
                    <button
                      onClick={() => setActiveTab("explore")}
                      className="mt-4 rounded-xl bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 transition-all cursor-pointer"
                    >
                      Discover Tracks
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
                {filteredTracks.map((track, index) => {
                  const isActive = currentTrack?.id === track.id;
                  const isTrackPlaying = isActive && isPlaying;

                  return (
                    <div
                      key={track.id}
                      onClick={() => handleTrackClick(track, index)}
                      className={`group relative flex flex-col justify-between rounded-xl border p-4 cursor-pointer transition-all duration-200 ${
                        isActive
                          ? "border-emerald-500/60 bg-zinc-900/90 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/30"
                          : "border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/80 hover:shadow-md"
                      }`}
                    >
                      <div className="flex items-start gap-3.5">
                        {/* Artwork */}
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

                        {/* Title & Artist */}
                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-sm font-semibold truncate transition-colors ${
                              isActive ? "text-emerald-400" : "text-zinc-100 group-hover:text-white"
                            }`}
                          >
                            {track.title}
                          </p>
                          <p className="text-xs text-zinc-400 truncate mt-0.5">
                            {track.artist}
                          </p>
                          {track.album && (
                            <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                              {track.album}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Card Bottom Meta */}
                      <div className="mt-4 flex items-center justify-between border-t border-zinc-800/60 pt-3">
                        <div className="flex items-center gap-2">
                          {isActive && (
                            <div className="flex items-end gap-0.5 h-3.5" title={isPlaying ? "Playing" : "Paused"}>
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

                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleLike(track.id);
                            }}
                            aria-label={isLiked(track.id) ? `Unlike ${track.title}` : `Like ${track.title}`}
                            className="p-1.5 rounded-full text-zinc-400 hover:text-emerald-400 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-400 cursor-pointer"
                          >
                            <Heart
                              className={`h-4 w-4 transition-transform active:scale-125 ${
                                isLiked(track.id)
                                  ? "fill-emerald-400 text-emerald-400"
                                  : "text-zinc-500 hover:text-zinc-300"
                              }`}
                            />
                          </button>

                          {/* Inline Play Action Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTrackClick(track, index);
                            }}
                            aria-label={isTrackPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
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
                })}
              </div>
            ) : (
              /* LIST / TABLE VIEW */
              <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/30">
                <div className="grid grid-cols-12 gap-2 border-b border-zinc-800/80 px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  <div className="col-span-1 text-center">#</div>
                  <div className="col-span-6 sm:col-span-5">Title & Artist</div>
                  <div className="hidden sm:block sm:col-span-4">Album</div>
                  <div className="col-span-5 sm:col-span-2 text-right flex items-center justify-end gap-1">
                    <Clock className="h-3 w-3" />
                    <span>Duration</span>
                  </div>
                </div>

                <div className="divide-y divide-zinc-800/50">
                  {filteredTracks.map((track, index) => {
                    const isActive = currentTrack?.id === track.id;
                    const isTrackPlaying = isActive && isPlaying;

                    return (
                      <div
                        key={track.id}
                        onClick={() => handleTrackClick(track, index)}
                        className={`group grid grid-cols-12 items-center gap-2 px-4 py-3 cursor-pointer transition-colors ${
                          isActive
                            ? "bg-emerald-500/10 text-zinc-100"
                            : "hover:bg-zinc-800/40 text-zinc-300"
                        }`}
                      >
                        {/* Track Index / Play Indicator */}
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
                              <span className={`text-xs font-mono group-hover:opacity-0 ${isActive ? "text-emerald-400 font-bold" : "text-zinc-500"}`}>
                                {index + 1}
                              </span>
                              <Play className="absolute h-3.5 w-3.5 text-zinc-100 fill-zinc-100 opacity-0 group-hover:opacity-100 transition-opacity ml-0.5" />
                            </div>
                          )}
                        </div>

                        {/* Cover Art + Title + Artist */}
                        <div className="col-span-6 sm:col-span-5 flex items-center gap-3 min-w-0">
                          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-zinc-800">
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
                                isActive ? "text-emerald-400" : "text-zinc-100 group-hover:text-white"
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

                        {/* Duration, Like & Play action */}
                        <div className="col-span-5 sm:col-span-2 flex items-center justify-end gap-2.5 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleLike(track.id);
                            }}
                            aria-label={isLiked(track.id) ? `Unlike ${track.title}` : `Like ${track.title}`}
                            className="p-1 rounded-full text-zinc-400 hover:text-emerald-400 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-400 cursor-pointer"
                          >
                            <Heart
                              className={`h-3.5 w-3.5 transition-transform active:scale-125 ${
                                isLiked(track.id)
                                  ? "fill-emerald-400 text-emerald-400"
                                  : "text-zinc-500 hover:text-zinc-300"
                              }`}
                            />
                          </button>

                          <span className={`text-xs font-mono ${isActive ? "text-emerald-400 font-medium" : "text-zinc-400"}`}>
                            {formatTime(track.duration)}
                          </span>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTrackClick(track, index);
                            }}
                            className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors cursor-pointer ${
                              isActive
                                ? "bg-emerald-500 text-zinc-950"
                                : "bg-zinc-800 text-zinc-400 opacity-0 group-hover:opacity-100 hover:bg-emerald-500 hover:text-zinc-950"
                            }`}
                            aria-label={isTrackPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
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
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
