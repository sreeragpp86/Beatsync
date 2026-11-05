"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
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
  Radio,
  Flame,
  Headphones,
  Guitar,
  Zap,
} from "lucide-react";
import { Track } from "@/types/track";
import { useAudioStore } from "@/stores/useAudioStore";
import { useLikesStore } from "@/stores/useLikesStore";
import { TrackCard } from "@/components/TrackCard";
import { LikeButton } from "@/components/LikeButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { InstallPrompt } from "@/components/InstallPrompt";

interface GenreMood {
  id: string;
  name: string;
  query: string;
  gradient: string;
  accent: string;
  icon: typeof Music2;
}

const GENRE_MOODS: GenreMood[] = [
  {
    id: "pop",
    name: "Pop",
    query: "pop hits",
    gradient: "from-emerald-500 via-teal-600 to-emerald-900",
    accent: "#10b981",
    icon: Sparkles,
  },
  {
    id: "hip-hop",
    name: "Hip-Hop",
    query: "hip hop",
    gradient: "from-orange-500 via-amber-600 to-orange-950",
    accent: "#f59e0b",
    icon: Flame,
  },
  {
    id: "lo-fi",
    name: "Lo-Fi",
    query: "lo-fi beats",
    gradient: "from-purple-500 via-indigo-600 to-purple-950",
    accent: "#a855f7",
    icon: Headphones,
  },
  {
    id: "rock",
    name: "Rock",
    query: "rock classics",
    gradient: "from-rose-600 via-red-600 to-rose-950",
    accent: "#f43f5e",
    icon: Guitar,
  },
  {
    id: "electronic",
    name: "Electronic",
    query: "electronic dance",
    gradient: "from-cyan-500 via-blue-600 to-cyan-950",
    accent: "#06b6d4",
    icon: Zap,
  },
  {
    id: "rnb",
    name: "R&B & Soul",
    query: "r&b soul",
    gradient: "from-pink-500 via-rose-600 to-pink-950",
    accent: "#ec4899",
    icon: Disc3,
  },
  {
    id: "indie",
    name: "Indie & Alt",
    query: "indie alternative",
    gradient: "from-lime-500 via-emerald-600 to-teal-900",
    accent: "#84cc16",
    icon: Radio,
  },
  {
    id: "chill",
    name: "Chill & Acoustic",
    query: "acoustic chill",
    gradient: "from-violet-500 via-purple-700 to-slate-900",
    accent: "#8b5cf6",
    icon: Music2,
  },
];

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function SearchHubContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const {
    currentTrack,
    isPlaying,
    playWithAutoQueue,
    togglePlay,
  } = useAudioStore();

  const { syncLikes, likedTrackIds } = useLikesStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Sync likes on mount
  useEffect(() => {
    syncLikes();
  }, [syncLikes]);

  // Debounced search handler (300ms) with AbortController
  const performSearch = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setTracks([]);
      setIsSearching(false);
      setHasSearched(false);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsSearching(true);
    setHasSearched(true);

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, {
        signal: controller.signal,
      });
      if (res.ok) {
        const data = await res.json();
        setTracks(data.tracks || []);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        console.warn("[BeatSync Search] Error searching tracks:", err);
      }
    } finally {
      if (abortControllerRef.current === controller) {
        setIsSearching(false);
      }
    }
  }, []);

  // Read initial query parameter or autofocus
  useEffect(() => {
    const initialQuery = searchParams.get("q") || searchParams.get("query") || "";
    if (initialQuery) {
      setSearchQuery(initialQuery);
      performSearch(initialQuery);
    } else {
      // Autofocus search input when visiting search hub
      searchInputRef.current?.focus();
    }
  }, [searchParams, performSearch]);

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
    setTracks([]);
    setIsSearching(false);
    setHasSearched(false);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    searchInputRef.current?.focus();
  };

  const handleSelectGenre = (genre: GenreMood) => {
    setSearchQuery(genre.name);
    searchInputRef.current?.focus();
    performSearch(genre.query);
  };

  const handleTrackClick = (track: Track) => {
    if (currentTrack?.id === track.id) {
      togglePlay();
    } else {
      playWithAutoQueue(track, tracks);
    }
  };

  // Top result and side songs for search results
  const topResult = searchQuery.trim() && tracks.length > 0 ? tracks[0] : null;
  const topSideSongs = searchQuery.trim() && tracks.length > 1 ? tracks.slice(1, 5) : [];
  const remainingMatchingSongs = searchQuery.trim() && tracks.length > 5 ? tracks.slice(5) : [];

  return (
    <div className="flex flex-col min-h-full">
      {/* Sticky Top Bar: Navigation Arrows + Search Input + Theme Toggle + Liked Counter */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-3.5 py-3 sm:px-6 sm:py-4 bg-[var(--bg-surface)]/90 backdrop-blur-md shadow-raised-sm sm:rounded-b-2xl select-none">
        <div className="flex items-center gap-2.5 sm:gap-4 flex-1 max-w-2xl min-w-0">
          {/* Back / Forward Arrows */}
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <button
              onClick={() => router.back()}
              aria-label="Go back"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--bg-surface)] shadow-raised-sm active:shadow-sunken-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => router.forward()}
              aria-label="Go forward"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--bg-surface)] shadow-raised-sm active:shadow-sunken-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* Sticky Search Input Bar - Recessed Trench (Autofocus, Debounce, Clear button) */}
          <div className="relative flex items-center flex-1 max-w-md bg-[var(--bg-surface)] shadow-sunken rounded-full px-4 py-2 sm:py-2.5 transition-all text-sm group min-w-0">
            <Search className="h-4 sm:h-5 w-4 sm:w-5 text-[var(--text-secondary)] shrink-0 mr-2 sm:mr-2.5 group-hover:text-[var(--text-primary)] transition-colors" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={handleInputChange}
              placeholder="What do you want to play?"
              autoFocus
              className="bg-transparent text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none w-full text-xs sm:text-sm font-medium"
            />
            {isSearching && (
              <Loader2 className="h-4 w-4 animate-spin text-[var(--text-primary)] shrink-0 ml-1 sm:ml-2" />
            )}
            {searchQuery && !isSearching && (
              <button
                onClick={handleClearSearch}
                aria-label="Clear search"
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-0.5 ml-1 sm:ml-2 cursor-pointer transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Right side: Install Prompt + Theme Toggle + Liked Pill */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-2">
          <InstallPrompt />
          <ThemeToggle />

          <Link
            href="/liked"
            className="hidden md:flex items-center gap-2 rounded-full bg-[var(--bg-surface)] shadow-raised-sm active:shadow-sunken-sm px-3.5 py-1.5 text-xs font-semibold text-[var(--text-primary)] transition-all"
          >
            <Heart className="h-3.5 w-3.5 text-[#E07A5F] fill-[#E07A5F]" />
            <span>Liked ({likedTrackIds.length})</span>
          </Link>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--bg-surface)] shadow-raised-sm text-[var(--text-primary)] font-bold text-xs">
            B
          </div>
        </div>
      </header>

      {/* Main Search Hub Content */}
      <div className="flex-1 px-3.5 sm:px-6 py-4 sm:py-6 space-y-6 sm:space-y-8">
        {/* STATE 1: LOADING SKELETON SHIMMER CARDS */}
        {isSearching && (
          <div className="space-y-8 animate-pulse">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Top Result Skeleton */}
              <div className="lg:col-span-5 flex flex-col">
                <div className="h-7 w-32 bg-[var(--text-secondary)]/15 rounded-lg mb-4" />
                <div className="h-64 rounded-2xl bg-[var(--bg-surface)] shadow-sunken-sm p-6 flex flex-col justify-between">
                  <div className="h-24 w-24 rounded-xl bg-[var(--text-secondary)]/15" />
                  <div className="space-y-2 mt-4">
                    <div className="h-6 w-3/4 bg-[var(--text-secondary)]/15 rounded-lg" />
                    <div className="h-4 w-1/2 bg-[var(--text-secondary)]/15 rounded-lg" />
                  </div>
                </div>
              </div>

              {/* Right 4 Songs Skeleton */}
              <div className="lg:col-span-7 flex flex-col">
                <div className="h-7 w-24 bg-[var(--text-secondary)]/15 rounded-lg mb-4" />
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-surface)] shadow-sunken-sm"
                    >
                      <div className="flex items-center gap-3.5 flex-1">
                        <div className="h-11 w-11 rounded-lg bg-[var(--text-secondary)]/15 shrink-0" />
                        <div className="space-y-2 flex-1 max-w-xs">
                          <div className="h-4 w-full bg-[var(--text-secondary)]/15 rounded" />
                          <div className="h-3 w-2/3 bg-[var(--text-secondary)]/15 rounded" />
                        </div>
                      </div>
                      <div className="h-4 w-12 bg-[var(--text-secondary)]/15 rounded" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Grid Skeleton */}
            <div className="space-y-4 pt-4">
              <div className="h-7 w-48 bg-[var(--text-secondary)]/15 rounded-lg" />
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="p-4 rounded-2xl bg-[var(--bg-surface)] shadow-sunken-sm space-y-3"
                  >
                    <div className="aspect-square w-full rounded-xl bg-[var(--text-secondary)]/15" />
                    <div className="h-4 w-3/4 bg-[var(--text-secondary)]/15 rounded" />
                    <div className="h-3 w-1/2 bg-[var(--text-secondary)]/15 rounded" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STATE 2: EMPTY QUERY -> BROWSE GENRE / MOOD CARDS */}
        {!isSearching && searchQuery.trim() === "" && (
          <section className="space-y-6 animate-in fade-in duration-300">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
                Browse all
              </h1>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                Explore popular genres, moods, and curated radio streams
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-5">
              {GENRE_MOODS.map((genre) => {
                const Icon = genre.icon;
                return (
                  <button
                    key={genre.id}
                    onClick={() => handleSelectGenre(genre)}
                    className="group relative overflow-hidden rounded-2xl p-4 sm:p-5 aspect-[1.3/1] bg-[var(--bg-surface)] shadow-raised-sm hover:shadow-raised active:shadow-sunken-sm text-left transition-all duration-200 cursor-pointer flex flex-col justify-between"
                  >
                    <span className="font-extrabold text-base sm:text-xl text-[var(--text-primary)] tracking-tight line-clamp-2">
                      {genre.name}
                    </span>

                    {/* Tactile Icon Container */}
                    <div className="self-end opacity-85 group-hover:opacity-100 group-hover:scale-110 transition-all duration-200">
                      <div className="flex h-11 w-11 sm:h-13 sm:w-13 items-center justify-center rounded-xl bg-[var(--bg-surface)] shadow-sunken-sm text-[var(--text-secondary)] group-hover:text-[#E07A5F] transition-colors">
                        <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* STATE 3: SEARCH RESULTS VIEW */}
        {!isSearching && searchQuery.trim() !== "" && (
          <section className="space-y-8 animate-in fade-in duration-200">
            {tracks.length === 0 && hasSearched ? (
              /* No Search Results State */
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Music2 className="h-14 w-14 text-[var(--text-secondary)] mb-4" />
                <h3 className="text-2xl font-bold text-[var(--text-primary)]">
                  No results found for &ldquo;{searchQuery}&rdquo;
                </h3>
                <p className="text-sm text-[var(--text-secondary)] mt-2 max-w-md">
                  Please make sure your words are spelled correctly, or try searching with different keywords, track titles, or artist names.
                </p>
                <button
                  onClick={handleClearSearch}
                  className="mt-6 rounded-full bg-[var(--bg-surface)] text-[var(--text-primary)] font-bold px-6 py-2.5 text-sm shadow-raised-sm active:shadow-sunken-sm hover:scale-105 transition-all cursor-pointer"
                >
                  Clear Search
                </button>
              </div>
            ) : (
              <>
                {/* Top Result + 4 Songs Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left Column: Top Result */}
                  {topResult && (
                    <div className="lg:col-span-5 flex flex-col">
                      <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">
                        Top result
                      </h2>

                      <div
                        onClick={() => handleTrackClick(topResult)}
                        className="group relative flex-1 flex flex-col justify-between rounded-2xl bg-[var(--bg-surface)] shadow-raised-sm hover:shadow-raised p-6 cursor-pointer transition-all duration-200"
                      >
                        <div>
                          {/* Top Result Artwork */}
                          <div className="relative h-28 w-28 overflow-hidden rounded-xl bg-[var(--bg-surface)] shadow-sunken-sm">
                            {topResult.cover_url ? (
                              <Image
                                src={topResult.cover_url}
                                alt={topResult.title}
                                fill
                                sizes="112px"
                                className="object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[var(--text-secondary)]">
                                <Music2 className="h-10 w-10" />
                              </div>
                            )}
                          </div>

                          {/* Title & Artist */}
                          <h3 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] mt-5 truncate">
                            {topResult.title}
                          </h3>
                          <p className="text-sm text-[var(--text-secondary)] mt-2 truncate">
                            <span className="text-[var(--text-primary)] font-semibold hover:underline">
                              {topResult.artist}
                            </span>
                            {topResult.album && ` • ${topResult.album}`}
                          </p>

                          <span className="inline-block rounded-full bg-[var(--bg-surface)] shadow-sunken-sm px-3.5 py-1 text-xs font-semibold text-[var(--text-secondary)] mt-5 tracking-wide uppercase">
                            Song
                          </span>
                        </div>

                        {/* Tactile Neomorphic Play Button */}
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
                          className={`absolute bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--bg-surface)] text-[var(--text-primary)] transition-all duration-200 cursor-pointer ${
                            currentTrack?.id === topResult.id && isPlaying
                              ? "shadow-sunken opacity-100 translate-y-0"
                              : "shadow-raised opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 hover:scale-105 active:shadow-sunken"
                          }`}
                        >
                          {currentTrack?.id === topResult.id && isPlaying ? (
                            <Pause className="h-6 w-6 fill-current" />
                          ) : (
                            <Play className="h-6 w-6 fill-current ml-0.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Right Column: 4 Songs List */}
                  <div className="lg:col-span-7 flex flex-col">
                    <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">
                      Songs
                    </h2>

                    <div className="flex flex-col gap-2">
                      {topSideSongs.map((track) => {
                        const isActive = currentTrack?.id === track.id;
                        const isTrackPlaying = isActive && isPlaying;

                        return (
                          <div
                            key={track.id}
                            onClick={() => handleTrackClick(track)}
                            className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${
                              isActive
                                ? "shadow-raised-sm bg-[var(--bg-surface)] text-[var(--text-primary)]"
                                : "hover:shadow-raised-sm active:shadow-sunken-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                            }`}
                          >
                            <div className="flex items-center gap-3.5 min-w-0 flex-1">
                              {/* Artwork with hover play icon */}
                              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-[var(--bg-surface)] shadow-sunken-sm">
                                {track.cover_url ? (
                                  <Image
                                    src={track.cover_url}
                                    alt={track.title}
                                    fill
                                    sizes="48px"
                                    className="object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-[var(--text-secondary)]">
                                    <Music2 className="h-5 w-5" />
                                  </div>
                                )}
                                <div
                                  className={`absolute inset-0 flex items-center justify-center bg-[var(--bg-surface)]/70 transition-opacity ${
                                    isTrackPlaying
                                      ? "opacity-100"
                                      : "opacity-0 group-hover:opacity-100"
                                  }`}
                                >
                                  {isTrackPlaying ? (
                                    <Pause className="h-5 w-5 text-[var(--text-primary)] fill-current" />
                                  ) : (
                                    <Play className="h-5 w-5 text-[var(--text-primary)] fill-current ml-0.5" />
                                  )}
                                </div>
                              </div>

                              {/* Title & Artist */}
                              <div className="min-w-0 flex-1 truncate">
                                <p
                                  className={`text-sm font-semibold truncate ${
                                    isActive ? "text-[var(--text-primary)] font-bold" : "text-[var(--text-primary)]"
                                  }`}
                                >
                                  {track.title}
                                </p>
                                <p className="text-xs text-[var(--text-secondary)] truncate mt-0.5">
                                  {track.artist}
                                </p>
                              </div>
                            </div>

                            {/* Duration & Like Button */}
                            <div className="flex items-center gap-3 shrink-0 pr-2">
                              <LikeButton track={track} trackId={track.id} size={17} />
                              <span className="text-xs font-mono text-[var(--text-secondary)] tabular-nums">
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
                  <div className="pt-4">
                    <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">
                      Featuring & More Tracks
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-5">
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
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-72 flex-col items-center justify-center gap-3 text-[#B3B3B3]">
          <Loader2 className="h-8 w-8 animate-spin text-[#1DB954]" />
          <p className="text-sm">Loading Search Hub...</p>
        </div>
      }
    >
      <SearchHubContent />
    </Suspense>
  );
}
