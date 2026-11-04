"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Heart,
  Music2,
  Loader2,
  Disc3,
  Sparkles,
} from "lucide-react";
import { Track } from "@/types/track";
import { useAudioStore } from "@/stores/useAudioStore";
import { useLikesStore } from "@/stores/useLikesStore";
import { TrackCard } from "@/components/TrackCard";
import { LikeButton } from "@/components/LikeButton";
import { toast } from "sonner";

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function HomeContent() {
  const searchParams = useSearchParams();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const {
    currentTrack,
    isPlaying,
    setQueue,
    playWithAutoQueue,
    togglePlay,
  } = useAudioStore();

  const { syncLikes, likedTrackIds } = useLikesStore();

  const [tracks, setTracks] = useState<Track[]>([]);
  const [defaultTracks, setDefaultTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Sync likes and load default tracks on mount
  useEffect(() => {
    syncLikes();

    fetch("/api/search")
      .then((res) => res.json())
      .then((data) => {
        const loaded = data.tracks || [];
        setDefaultTracks(loaded);
        setTracks(loaded);
      })
      .catch((err) => {
        console.warn("[BeatSync] Failed to fetch initial catalog:", err);
      })
      .finally(() => {
        setIsLoading(false);
        // Test toast notification confirming streaming readiness
        toast.success("Ready to stream");
      });
  }, [syncLikes]);

  // Focus search input if ?search=focus in URL
  useEffect(() => {
    if (searchParams.get("search") === "focus") {
      searchInputRef.current?.focus();
    }
  }, [searchParams]);

  // Debounced search handler (300ms) with AbortController to prevent race conditions
  const performSearch = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setTracks(defaultTracks);
      setIsSearching(false);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, {
        signal: controller.signal,
      });
      if (res.ok) {
        const data = await res.json();
        setTracks(data.tracks || []);
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.warn("[BeatSync] Search error:", err);
      }
    } finally {
      if (abortControllerRef.current === controller) {
        setIsSearching(false);
      }
    }
  }, [defaultTracks]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      performSearch(val);
    }, 300);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setTracks(defaultTracks);
    setIsSearching(false);
    searchInputRef.current?.focus();
  };

  const handleTrackClick = (track: Track) => {
    if (currentTrack?.id === track.id) {
      togglePlay();
    } else {
      playWithAutoQueue(track, tracks);
    }
  };

  // Top result and side songs for active search state
  const topResult = searchQuery.trim() && tracks.length > 0 ? tracks[0] : null;
  const topSideSongs = searchQuery.trim() && tracks.length > 1 ? tracks.slice(1, 5) : [];
  const remainingMatchingSongs = searchQuery.trim() && tracks.length > 5 ? tracks.slice(5) : [];

  // Dynamic greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="flex flex-col min-h-full">
      {/* Sticky Top Bar: Navigation Arrows + Search Input */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 bg-[#121212]/95 backdrop-blur-md border-b border-[#282828]/50">
        <div className="flex items-center gap-4 flex-1 max-w-2xl">
          {/* Back / Forward Arrows */}
          <div className="hidden sm:flex items-center gap-2 shrink-0">
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

          {/* Search Input Bar (Pill style) */}
          <div className="relative flex items-center w-full max-w-md bg-[#242424] hover:bg-[#2a2a2a] focus-within:bg-[#2a2a2a] rounded-full px-3.5 py-2.5 border border-transparent focus-within:border-white/20 transition-all text-sm group">
            <Search className="h-5 w-5 text-[#B3B3B3] shrink-0 mr-2.5 group-hover:text-white transition-colors" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={handleInputChange}
              placeholder="What do you want to play?"
              className="bg-transparent text-white placeholder-[#757575] outline-none w-full text-sm font-medium"
            />
            {isSearching && (
              <Loader2 className="h-4 w-4 animate-spin text-[#1DB954] shrink-0 ml-2" />
            )}
            {searchQuery && !isSearching && (
              <button
                onClick={handleClearSearch}
                aria-label="Clear search"
                className="text-[#B3B3B3] hover:text-white p-0.5 ml-2 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Right side status / profile pill */}
        <div className="flex items-center gap-3">
          <Link
            href="/liked"
            className="hidden md:flex items-center gap-2 rounded-full bg-[#242424] hover:bg-[#2a2a2a] px-3 py-1.5 text-xs font-semibold text-white transition-colors border border-transparent hover:border-white/10"
          >
            <Heart className="h-3.5 w-3.5 text-rose-500 fill-rose-500" />
            <span>Liked ({likedTrackIds.length})</span>
          </Link>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#282828] text-white font-bold text-xs shadow-inner">
            B
          </div>
        </div>
      </header>

      {/* Main Scrollable Content */}
      <div className="flex-1 px-6 py-6 space-y-8">
        {/* Loading Spinner */}
        {isLoading && (
          <div className="flex h-72 flex-col items-center justify-center gap-3 text-[#B3B3B3]">
            <Loader2 className="h-8 w-8 animate-spin text-[#1DB954]" />
            <p className="text-sm">Loading music catalog...</p>
          </div>
        )}

        {/* STATE A: ACTIVE SEARCH VIEW */}
        {!isLoading && searchQuery.trim() !== "" && (
          <section className="space-y-8 animate-in fade-in duration-200">
            {tracks.length === 0 ? (
              /* No Search Results State */
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Music2 className="h-12 w-12 text-[#757575] mb-4" />
                <h3 className="text-2xl font-bold text-white">
                  No results found for &ldquo;{searchQuery}&rdquo;
                </h3>
                <p className="text-sm text-[#B3B3B3] mt-2 max-w-md">
                  Please make sure your words are spelled correctly, or try searching with different keywords or artist names.
                </p>
                <button
                  onClick={handleClearSearch}
                  className="mt-6 rounded-full bg-white text-black font-bold px-6 py-2.5 text-sm hover:scale-105 active:scale-95 transition-transform cursor-pointer"
                >
                  Clear Search
                </button>
              </div>
            ) : (
              <>
                {/* Top Section: Top Result on Left + 4 Songs on Right */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left Column: Top Result */}
                  {topResult && (
                    <div className="lg:col-span-5 flex flex-col">
                      <h2 className="text-2xl font-bold text-white mb-4">
                        Top result
                      </h2>

                      <div
                        onClick={() => handleTrackClick(topResult)}
                        className="group relative flex-1 flex flex-col justify-between rounded-lg bg-[#181818] hover:bg-[#282828] p-5 cursor-pointer transition-all duration-300 shadow-md hover:shadow-xl"
                      >
                        <div>
                          {/* Top Result Artwork */}
                          <div className="relative h-24 w-24 overflow-hidden rounded-md bg-[#282828] shadow-lg">
                            {topResult.cover_url ? (
                              <Image
                                src={topResult.cover_url}
                                alt={topResult.title}
                                fill
                                sizes="96px"
                                className="object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[#B3B3B3]">
                                <Music2 className="h-8 w-8" />
                              </div>
                            )}
                          </div>

                          {/* Title & Artist */}
                          <h3 className="text-2xl sm:text-3xl font-bold text-white mt-4 truncate">
                            {topResult.title}
                          </h3>
                          <p className="text-sm text-[#B3B3B3] mt-1.5 truncate">
                            <span className="text-white font-medium hover:underline">
                              {topResult.artist}
                            </span>
                            {topResult.album && ` • ${topResult.album}`}
                          </p>

                          <span className="inline-block rounded-full bg-[#242424] px-3 py-1 text-xs font-bold text-white mt-4">
                            Song
                          </span>
                        </div>

                        {/* Floating Emerald Play Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTrackClick(topResult);
                          }}
                          aria-label={
                            currentTrack?.id === topResult.id && isPlaying
                              ? "Pause"
                              : "Play"
                          }
                          className={`absolute bottom-5 right-5 flex h-12 w-12 items-center justify-center rounded-full bg-[#1DB954] text-black shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer ${
                            currentTrack?.id === topResult.id && isPlaying
                              ? "opacity-100 translate-y-0"
                              : "opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0"
                          }`}
                        >
                          {currentTrack?.id === topResult.id && isPlaying ? (
                            <Pause className="h-5 w-5 fill-black" />
                          ) : (
                            <Play className="h-5 w-5 fill-black ml-0.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Right Column: 4 Songs List */}
                  <div className="lg:col-span-7 flex flex-col">
                    <h2 className="text-2xl font-bold text-white mb-4">
                      Songs
                    </h2>

                    <div className="flex flex-col gap-1">
                      {topSideSongs.map((track) => {
                        const isActive = currentTrack?.id === track.id;
                        const isTrackPlaying = isActive && isPlaying;

                        return (
                          <div
                            key={track.id}
                            onClick={() => handleTrackClick(track)}
                            className={`group flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${
                              isActive
                                ? "bg-[#282828] text-white"
                                : "hover:bg-[#282828]/70 text-[#B3B3B3] hover:text-white"
                            }`}
                          >
                            <div className="flex items-center gap-3.5 min-w-0 flex-1">
                              {/* Artwork with hover play icon */}
                              <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded bg-[#282828] shadow-sm">
                                {track.cover_url ? (
                                  <Image
                                    src={track.cover_url}
                                    alt={track.title}
                                    fill
                                    sizes="44px"
                                    className="object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-[#B3B3B3]">
                                    <Music2 className="h-5 w-5" />
                                  </div>
                                )}
                                <div
                                  className={`absolute inset-0 flex items-center justify-center bg-black/60 transition-opacity ${
                                    isTrackPlaying
                                      ? "opacity-100"
                                      : "opacity-0 group-hover:opacity-100"
                                  }`}
                                >
                                  {isTrackPlaying ? (
                                    <Pause className="h-4 w-4 text-white fill-white" />
                                  ) : (
                                    <Play className="h-4 w-4 text-white fill-white ml-0.5" />
                                  )}
                                </div>
                              </div>

                              {/* Title & Artist */}
                              <div className="min-w-0 flex-1 truncate">
                                <p
                                  className={`text-sm font-semibold truncate ${
                                    isActive ? "text-[#1DB954]" : "text-white"
                                  }`}
                                >
                                  {track.title}
                                </p>
                                <p className="text-xs text-[#B3B3B3] truncate mt-0.5">
                                  {track.artist}
                                </p>
                              </div>
                            </div>

                            {/* Duration & Like Button */}
                            <div className="flex items-center gap-3 shrink-0 pr-2">
                              <LikeButton track={track} trackId={track.id} size={16} />
                              <span className="text-xs font-mono text-[#B3B3B3] tabular-nums">
                                {formatTime(track.duration)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Bottom Section: Remaining Matching Songs Grid */}
                {remainingMatchingSongs.length > 0 && (
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-4">
                      Featuring & More Tracks
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                      {remainingMatchingSongs.map((track) => (
                        <TrackCard
                          key={track.id}
                          track={track}
                          allTracks={tracks}
                          onPlay={() => handleTrackClick(track)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </section>
        )}

        {/* STATE B: DEFAULT SPOTIFY HOME FEED */}
        {!isLoading && searchQuery.trim() === "" && (
          <section className="space-y-8 animate-in fade-in duration-200">
            {/* Header Greeting */}
            <div>
              <h1 className="text-3xl font-extrabold text-white tracking-tight">
                {getGreeting()}
              </h1>

              {/* Spotify 2x3 Quick Tiles */}
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* Liked Songs Tile */}
                <Link
                  href="/liked"
                  className="group relative flex items-center rounded overflow-hidden bg-[#282828]/50 hover:bg-[#282828] transition-colors shadow-sm cursor-pointer"
                >
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center bg-gradient-to-br from-indigo-600 via-purple-600 to-rose-400 text-white shadow-md">
                    <Heart className="h-7 w-7 fill-white" />
                  </div>
                  <span className="font-bold text-sm text-white px-4 truncate">
                    Liked Songs
                  </span>
                  <div className="ml-auto mr-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1DB954] text-black shadow-lg">
                      <Play className="h-4 w-4 fill-black ml-0.5" />
                    </div>
                  </div>
                </Link>

                {/* 5 Additional Quick Tiles based on tracks */}
                {defaultTracks.slice(0, 5).map((track) => {
                  const isCurrent = currentTrack?.id === track.id;
                  const isPlayingCurrent = isCurrent && isPlaying;

                  return (
                    <div
                      key={track.id}
                      onClick={() => handleTrackClick(track)}
                      className="group relative flex items-center rounded overflow-hidden bg-[#282828]/50 hover:bg-[#282828] transition-colors shadow-sm cursor-pointer"
                    >
                      <div className="relative h-16 w-16 shrink-0 bg-[#181818]">
                        {track.cover_url ? (
                          <Image
                            src={track.cover_url}
                            alt={track.title}
                            fill
                            sizes="64px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[#B3B3B3]">
                            <Music2 className="h-6 w-6" />
                          </div>
                        )}
                      </div>
                      <span className="font-bold text-sm text-white px-4 truncate flex-1">
                        {track.title}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTrackClick(track);
                        }}
                        aria-label={isPlayingCurrent ? "Pause" : "Play"}
                        className={`mr-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1DB954] text-black shadow-lg transition-all hover:scale-105 active:scale-95 ${
                          isPlayingCurrent
                            ? "opacity-100"
                            : "opacity-0 group-hover:opacity-100"
                        }`}
                      >
                        {isPlayingCurrent ? (
                          <Pause className="h-4 w-4 fill-black" />
                        ) : (
                          <Play className="h-4 w-4 fill-black ml-0.5" />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Popular Hits / Trending Now Grid */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-white hover:underline cursor-pointer">
                  Trending Now
                </h2>
                <button
                  onClick={() => {
                    if (defaultTracks.length > 0) {
                      setQueue(defaultTracks, 0);
                    }
                  }}
                  className="text-xs font-bold text-[#B3B3B3] hover:underline hover:text-white uppercase tracking-wider cursor-pointer"
                >
                  Play All
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
                {defaultTracks.slice(0, 12).map((track) => (
                  <TrackCard
                    key={track.id}
                    track={track}
                    allTracks={defaultTracks}
                    onPlay={() => handleTrackClick(track)}
                  />
                ))}
              </div>
            </div>

            {/* Featured Section */}
            {defaultTracks.length > 6 && (
              <div>
                <h2 className="text-2xl font-bold text-white mb-4 hover:underline cursor-pointer">
                  Made For You
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
                  {defaultTracks.slice(6).map((track) => (
                    <TrackCard
                      key={`made-for-you-${track.id}`}
                      track={track}
                      allTracks={defaultTracks}
                      onPlay={() => handleTrackClick(track)}
                    />
                  ))}
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="flex h-72 flex-col items-center justify-center gap-3 text-[#B3B3B3]">
          <Loader2 className="h-8 w-8 animate-spin text-[#1DB954]" />
          <p className="text-sm">Loading music...</p>
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
