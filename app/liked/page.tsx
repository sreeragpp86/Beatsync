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
import { ThemeToggle } from "@/components/ThemeToggle";
import { InstallPrompt } from "@/components/InstallPrompt";

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

function LikedSongsContent() {
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
      {/* Sticky Top Bar with Back/Forward & Theme Toggle & Search Hub Navigation */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-3.5 py-3 sm:px-6 sm:py-4 bg-[var(--bg-surface)]/90 backdrop-blur-md shadow-raised-sm sm:rounded-b-2xl select-none">
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.history.back()}
            aria-label="Go back"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--bg-surface)] shadow-raised-sm active:shadow-sunken-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => window.history.forward()}
            aria-label="Go forward"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--bg-surface)] shadow-raised-sm active:shadow-sunken-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <InstallPrompt />
          <ThemeToggle />
          <Link
            href="/search"
            className="text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-3.5 py-1.5 rounded-full bg-[var(--bg-surface)] shadow-raised-sm active:shadow-sunken-sm transition-all flex items-center gap-1.5 shrink-0"
          >
            <Compass className="h-4 w-4 text-[#E07A5F]" />
            <span>Find Music</span>
          </Link>
        </div>
      </header>

      {/* Neomorphic Soft Liked Songs Hero Header */}
      <section className="relative px-4 sm:px-8 pt-6 sm:pt-8 pb-6 sm:pb-8">
        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 sm:gap-8">
          {/* Large Tactile Heart Badge */}
          <div className="flex h-32 w-32 sm:h-44 sm:w-44 shrink-0 items-center justify-center rounded-3xl bg-[var(--bg-surface)] shadow-sunken text-[#E07A5F] transition-transform duration-300 hover:scale-[1.02]">
            <Heart className="h-16 w-16 sm:h-20 sm:w-20 fill-[#E07A5F]" />
          </div>

          {/* Playlist Metadata */}
          <div className="flex-1 text-center sm:text-left min-w-0">
            <span className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]">
              Playlist
            </span>
            <h1 className="mt-1 text-3xl sm:text-5xl lg:text-6xl font-black text-[var(--text-primary)] tracking-tight">
              Liked Songs
            </h1>
            <p className="mt-3 text-sm text-[var(--text-secondary)] flex flex-wrap items-center justify-center sm:justify-start gap-1.5">
              <span className="font-bold text-[var(--text-primary)]">
                BeatSync User
              </span>
              <span>•</span>
              <span className="font-medium">
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
      <div className="px-4 sm:px-8 py-4 sm:py-6 space-y-6 flex-1">
        {/* Play Action Bar (Circular Neomorphic "Play All" Button) */}
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
              className={`flex h-14 w-14 items-center justify-center rounded-full bg-[var(--bg-surface)] text-[var(--text-primary)] transition-all cursor-pointer ${
                isCurrentTrackInLiked && isPlaying
                  ? "shadow-sunken"
                  : "shadow-raised hover:scale-105 active:shadow-sunken"
              }`}
            >
              {isCurrentTrackInLiked && isPlaying ? (
                <Pause className="h-6 w-6 fill-current" />
              ) : (
                <Play className="h-6 w-6 fill-current ml-0.5" />
              )}
            </button>
          </div>
        )}

        {/* Tracks List / Table */}
        {!mounted ? (
          <div className="flex h-56 flex-col items-center justify-center gap-3 text-[var(--text-secondary)]">
            <Loader2 className="h-7 w-7 animate-spin text-[var(--text-primary)]" />
            <span className="text-sm font-medium">Loading your liked songs...</span>
          </div>
        ) : tracks.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[var(--bg-surface)] shadow-sunken-sm text-[var(--text-secondary)] mb-5">
              <Heart className="h-9 w-9 text-[#E07A5F]" />
            </div>
            <h3 className="text-2xl font-bold text-[var(--text-primary)]">
              No liked tracks yet
            </h3>
            <p className="text-sm text-[var(--text-secondary)] mt-2 max-w-sm">
              Save tracks to your library by tapping the heart icon on any song card, row, or in the player dock.
            </p>
            <Link
              href="/search"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--bg-surface)] px-7 py-3 text-sm font-bold text-[var(--text-primary)] shadow-raised-sm active:shadow-sunken-sm hover:scale-105 transition-all cursor-pointer"
            >
              <Compass className="h-4 w-4 text-[#E07A5F]" />
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
