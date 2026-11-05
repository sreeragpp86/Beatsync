"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Heart,
  Music2,
  Loader2,
  Sparkles,
  TrendingUp,
  Flame,
} from "lucide-react";
import { Track } from "@/types/track";
import { useAudioStore } from "@/stores/useAudioStore";
import { useLikesStore } from "@/stores/useLikesStore";
import { TrackCard } from "@/components/TrackCard";
import { ThemeToggle } from "@/components/ThemeToggle";

interface CarouselSectionProps {
  title: string;
  subtitle?: string;
  icon?: typeof Music2;
  tracks: Track[];
  allTracks: Track[];
  onPlayTrack: (track: Track) => void;
  onPlayAll: () => void;
}

function CarouselSection({
  title,
  subtitle,
  icon: Icon,
  tracks,
  allTracks,
  onPlayTrack,
  onPlayAll,
}: CarouselSectionProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === "left" ? -460 : 460;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  if (!tracks || tracks.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* Carousel Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            {Icon && <Icon className="h-5 w-5 text-[#E07A5F]" />}
            <h2 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight hover:underline cursor-pointer">
              {title}
            </h2>
          </div>
          {subtitle && (
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">{subtitle}</p>
          )}
        </div>

        {/* Carousel Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={onPlayAll}
            className="text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] uppercase tracking-wider px-3.5 py-1.5 rounded-full bg-[var(--bg-surface)] shadow-raised-sm active:shadow-sunken-sm transition-all cursor-pointer mr-1"
          >
            Play All
          </button>
          <div className="hidden sm:flex items-center gap-2">
            <button
              onClick={() => scroll("left")}
              aria-label={`Scroll ${title} left`}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--bg-surface)] shadow-raised-sm active:shadow-sunken-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => scroll("right")}
              aria-label={`Scroll ${title} right`}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--bg-surface)] shadow-raised-sm active:shadow-sunken-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Horizontal Scroll Container */}
      <div
        ref={scrollContainerRef}
        className="flex gap-3 sm:gap-4 overflow-x-auto scroll-smooth scrollbar-none pb-2 pt-1 -mx-2 px-2"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {tracks.map((track) => (
          <div key={track.id} className="w-36 sm:w-48 shrink-0">
            <TrackCard
              track={track}
              allTracks={allTracks}
              onPlay={() => onPlayTrack(track)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function HomeContent() {
  const router = useRouter();

  const {
    currentTrack,
    isPlaying,
    setQueue,
    playWithAutoQueue,
    togglePlay,
  } = useAudioStore();

  const { syncLikes, likedTrackIds, likedTracks } = useLikesStore();

  const [tracks, setTracks] = useState<Track[]>([]);
  const [recentlyPlayed, setRecentlyPlayed] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Sync likes and load default catalog tracks
  useEffect(() => {
    syncLikes();

    fetch("/api/search")
      .then((res) => res.json())
      .then((data) => {
        const loaded: Track[] = data.tracks || [];
        setTracks(loaded);
      })
      .catch((err) => {
        console.warn("[BeatSync] Failed to fetch initial catalog:", err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [syncLikes]);

  // Load recently played tracks from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem("beatsync_recently_played_v1");
      if (raw) {
        const parsed: Track[] = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRecentlyPlayed(parsed);
        }
      }
    } catch (err) {
      console.warn("[BeatSync] Failed to read recently played tracks:", err);
    }
  }, [currentTrack]);

  // Dynamic time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const handleTrackClick = (track: Track) => {
    if (currentTrack?.id === track.id) {
      togglePlay();
    } else {
      playWithAutoQueue(track, tracks);
    }
  };

  // Compile quick 6 tiles: Liked Songs + 5 recently played (or top catalog)
  const quickTracks: Track[] = (() => {
    const result: Track[] = [];
    const seenIds = new Set<string>();

    for (const t of recentlyPlayed) {
      if (!seenIds.has(t.id)) {
        seenIds.add(t.id);
        result.push(t);
        if (result.length === 5) break;
      }
    }

    if (result.length < 5) {
      for (const t of tracks) {
        if (!seenIds.has(t.id)) {
          seenIds.add(t.id);
          result.push(t);
          if (result.length === 5) break;
        }
      }
    }

    return result;
  })();

  // Partition tracks for carousels
  const popularHits = tracks.slice(0, 8);
  const trendingNow = tracks.slice(8, 16);
  const madeForYou = tracks.slice(16);

  return (
    <div className="flex flex-col min-h-full">
      {/* Sticky Top Bar: Navigation Arrows + Quick Search Pill + Theme Toggle + Liked Counter */}
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

          {/* Quick Search Hub Button Pill - Recessed Trench */}
          <Link
            href="/search"
            className="relative flex items-center flex-1 max-w-md bg-[var(--bg-surface)] shadow-sunken rounded-full px-4 py-2 sm:py-2.5 transition-all text-sm group min-w-0"
          >
            <Search className="h-4 sm:h-5 w-4 sm:w-5 text-[var(--text-secondary)] shrink-0 mr-2 sm:mr-2.5 group-hover:text-[var(--text-primary)] transition-colors" />
            <span className="text-[var(--text-secondary)] text-xs sm:text-sm font-medium transition-colors truncate">
              What do you want to play?
            </span>
          </Link>
        </div>

        {/* Right side: Theme Toggle + Liked Pill */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-2">
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

      {/* Main Discover Content */}
      <div className="flex-1 px-3.5 sm:px-6 py-4 sm:py-6 space-y-8 sm:space-y-10">
        {/* Loading Spinner */}
        {isLoading && (
          <div className="flex h-72 flex-col items-center justify-center gap-3 text-[var(--text-secondary)]">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--text-primary)]" />
            <p className="text-sm">Loading Discover feed...</p>
          </div>
        )}

        {!isLoading && (
          <section className="space-y-8 sm:space-y-10 animate-in fade-in duration-300">
            {/* Dynamic Greeting & Quick 6-Card Grid */}
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
                {getGreeting()}
              </h1>

              {/* Neomorphic 2x3 Quick Tiles Grid */}
              <div className="mt-3 sm:mt-4 grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* 1. Liked Songs Tile */}
                <Link
                  href="/liked"
                  className="group relative flex items-center rounded-2xl overflow-hidden bg-[var(--bg-surface)] shadow-raised-sm hover:shadow-raised active:shadow-sunken-sm transition-all p-1.5 sm:p-2 cursor-pointer min-w-0"
                >
                  <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-xl bg-[var(--bg-surface)] shadow-sunken-sm text-[#E07A5F]">
                    <Heart className="h-5 w-5 sm:h-6 sm:w-6 fill-[#E07A5F]" />
                  </div>
                  <div className="px-2.5 sm:px-3 flex-1 min-w-0 truncate">
                    <span className="font-bold text-xs sm:text-sm text-[var(--text-primary)] block truncate">
                      Liked Songs
                    </span>
                    <span className="text-[10px] sm:text-xs text-[var(--text-secondary)] block truncate mt-0.5">
                      {likedTracks.length} song{likedTracks.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="ml-auto mr-2 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--bg-surface)] shadow-raised text-[var(--text-primary)]">
                      <Play className="h-4 w-4 fill-current ml-0.5" />
                    </div>
                  </div>
                </Link>

                {/* 2-6. 5 Recently Played / Top Tiles */}
                {quickTracks.map((track) => {
                  const isCurrent = currentTrack?.id === track.id;
                  const isPlayingCurrent = isCurrent && isPlaying;

                  return (
                    <div
                      key={track.id}
                      onClick={() => handleTrackClick(track)}
                      className="group relative flex items-center rounded-2xl overflow-hidden bg-[var(--bg-surface)] shadow-raised-sm hover:shadow-raised active:shadow-sunken-sm transition-all p-1.5 sm:p-2 cursor-pointer min-w-0"
                    >
                      <div className="relative h-12 w-12 sm:h-14 sm:w-14 shrink-0 rounded-xl overflow-hidden bg-[var(--bg-surface)] shadow-sunken-sm">
                        {track.cover_url ? (
                          <Image
                            src={track.cover_url}
                            alt={track.title}
                            fill
                            sizes="64px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[var(--text-secondary)]">
                            <Music2 className="h-5 w-5 sm:h-6 sm:w-6" />
                          </div>
                        )}
                      </div>
                      <div className="px-2.5 sm:px-3 flex-1 min-w-0 truncate">
                        <span className="font-bold text-xs sm:text-sm text-[var(--text-primary)] block truncate">
                          {track.title}
                        </span>
                        <span className="text-[10px] sm:text-xs text-[var(--text-secondary)] block truncate mt-0.5">
                          {track.artist}
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTrackClick(track);
                        }}
                        aria-label={isPlayingCurrent ? `Pause ${track.title}` : `Play ${track.title}`}
                        className={`mr-2 flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full bg-[var(--bg-surface)] text-[var(--text-primary)] transition-all cursor-pointer ${
                          isPlayingCurrent
                            ? "shadow-sunken opacity-100"
                            : "shadow-raised opacity-0 group-hover:opacity-100 hover:scale-105 hidden sm:flex"
                        }`}
                      >
                        {isPlayingCurrent ? (
                          <Pause className="h-4 w-4 fill-current" />
                        ) : (
                          <Play className="h-4 w-4 fill-current ml-0.5" />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Horizontal Carousel 1: Popular Hits */}
            {popularHits.length > 0 && (
              <CarouselSection
                title="Popular Hits"
                subtitle="The biggest tracks streaming worldwide right now"
                icon={Flame}
                tracks={popularHits}
                allTracks={tracks}
                onPlayTrack={handleTrackClick}
                onPlayAll={() => setQueue(popularHits, 0)}
              />
            )}

            {/* Horizontal Carousel 2: Trending Now */}
            {trendingNow.length > 0 && (
              <CarouselSection
                title="Trending Now"
                subtitle="Catch the wave of rising viral sensations"
                icon={TrendingUp}
                tracks={trendingNow}
                allTracks={tracks}
                onPlayTrack={handleTrackClick}
                onPlayAll={() => setQueue(trendingNow, 0)}
              />
            )}

            {/* Featured Section 3: Made For You Grid */}
            {madeForYou.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-[#E07A5F]" />
                      <h2 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight hover:underline cursor-pointer">
                        Made For You
                      </h2>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      Personalized recommendations based on your listening habits
                    </p>
                  </div>
                  <button
                    onClick={() => setQueue(madeForYou, 0)}
                    className="text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] uppercase tracking-wider px-3.5 py-1.5 rounded-full bg-[var(--bg-surface)] shadow-raised-sm active:shadow-sunken-sm transition-all cursor-pointer"
                  >
                    Play All
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-5">
                  {madeForYou.map((track) => (
                    <TrackCard
                      key={`made-for-you-${track.id}`}
                      track={track}
                      allTracks={tracks}
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
