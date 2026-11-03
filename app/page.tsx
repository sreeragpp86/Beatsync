"use client";

import { useState, useEffect, useId } from "react";
import Image from "next/image";
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
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
} from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase";
import { getTracks } from "@/lib/tracks";
import { useAudioStore } from "@/stores/useAudioStore";
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
    currentTime,
    duration,
    volume,
    queue,
    queueIndex,
    setQueue,
    playTrack,
    togglePlay,
    seek,
    setVolume,
    playNext,
    playPrevious,
  } = useAudioStore();

  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"explore" | "library" | "radio">(
    "explore"
  );
  const volumeSliderId = useId();

  // Load tracks via the data access layer
  useEffect(() => {
    let mounted = true;
    getTracks()
      .then((data) => {
        if (mounted) {
          setTracks(data);
        }
      })
      .catch((err) => {
        console.warn("[SoundWave] Failed to load tracks:", err);
      })
      .finally(() => {
        if (mounted) {
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const activeTrack = currentTrack ?? tracks[0] ?? null;
  const totalDuration = duration > 0 ? duration : activeTrack?.duration ?? 0;
  const progressPercent = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  const handleTrackSelect = (track: Track, index: number) => {
    if (queue.length === 0 || queue !== tracks) {
      setQueue(tracks, index);
    } else {
      playTrack(track);
    }
  };

  const handleScrub = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickRatio = Math.max(0, Math.min(1, clickX / rect.width));
    seek(clickRatio * totalDuration);
  };

  return (
    <div className="flex h-screen flex-col bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
      {/* Top Navbar */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-zinc-800/80 bg-zinc-950/80 px-6 backdrop-blur-md">
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
              <span>Supabase Connected</span>
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
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="hidden w-64 flex-col justify-between border-r border-zinc-800/80 bg-zinc-900/30 p-4 md:flex">
          <div className="space-y-6">
            <div className="space-y-1">
              <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Discover
              </p>
              <button
                onClick={() => setActiveTab("explore")}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
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
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
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
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  activeTab === "library"
                    ? "bg-zinc-800 text-emerald-400 shadow-sm"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                }`}
              >
                <Library className="h-4 w-4" />
                Your Library
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
            <p className="text-zinc-300 font-medium">Controls</p>
            <p className="mt-1 text-[11px] leading-relaxed">
              Click any track to stream instantly. The bottom bar supports scrubbing, volume control, and auto-advance.
            </p>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {/* Hero Banner */}
          <section className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 p-6 md:p-8 shadow-xl">
            <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
            <div className="absolute -left-16 -bottom-16 h-64 w-64 rounded-full bg-violet-600/10 blur-3xl" />

            <div className="relative z-10 max-w-xl">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/30">
                <Music2 className="h-3 w-3" />
                Featured Playlist
              </span>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-zinc-100 sm:text-4xl">
                Experience music with zero friction.
              </h1>
              <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                Stream public-domain masterworks through our reactive Zustand audio store, HTML5 singleton, and Supabase data layer.
              </p>

              <div className="mt-5 flex items-center gap-3">
                <button
                  onClick={() => {
                    if (tracks.length > 0) {
                      if (!currentTrack) {
                        setQueue(tracks, 0);
                      } else {
                        togglePlay();
                      }
                    }
                  }}
                  disabled={tracks.length === 0}
                  className="flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 shadow-lg shadow-emerald-500/25 transition-all hover:bg-emerald-400 active:scale-95 disabled:opacity-50"
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
                    if (tracks.length > 0) setQueue(tracks, 0);
                  }}
                  disabled={tracks.length === 0}
                  className="flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800/80 px-4 py-2.5 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-800 hover:text-white disabled:opacity-50"
                >
                  <ListMusic className="h-4 w-4 text-violet-400" />
                  Load Entire Queue
                </button>
              </div>
            </div>
          </section>

          {/* Track Grid */}
          <section className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold tracking-tight text-zinc-100">
                Trending Tracks
              </h2>
              <span className="text-xs text-zinc-400">
                {isLoading ? "Fetching catalog..." : `${tracks.length} tracks available`}
              </span>
            </div>

            {isLoading ? (
              <div className="flex h-48 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/30">
                <div className="flex items-center gap-2.5 text-sm text-zinc-400">
                  <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
                  <span>Loading music catalog...</span>
                </div>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {tracks.map((track, index) => {
                  const isSelected = activeTrack?.id === track.id;
                  return (
                    <div
                      key={track.id}
                      onClick={() => handleTrackSelect(track, index)}
                      className={`group flex items-center justify-between rounded-xl border p-4 cursor-pointer transition-all ${
                        isSelected
                          ? "border-emerald-500/50 bg-zinc-900 shadow-md shadow-emerald-500/5"
                          : "border-zinc-800/80 bg-zinc-900/50 hover:border-zinc-700 hover:bg-zinc-900"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-zinc-800">
                          {track.cover_url ? (
                            <Image
                              src={track.cover_url}
                              alt={track.title}
                              fill
                              sizes="48px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <Music2 className="h-5 w-5 text-zinc-400" />
                            </div>
                          )}
                          <div
                            className={`absolute inset-0 flex items-center justify-center transition-opacity ${
                              isSelected && isPlaying
                                ? "bg-zinc-950/60 opacity-100"
                                : "bg-zinc-950/40 opacity-0 group-hover:opacity-100"
                            }`}
                          >
                            {isSelected && isPlaying ? (
                              <Pause className="h-5 w-5 text-emerald-400 fill-emerald-400" />
                            ) : (
                              <Play className="h-5 w-5 text-white fill-white ml-0.5" />
                            )}
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-zinc-100 line-clamp-1">
                            {track.title}
                          </p>
                          <p className="text-xs text-zinc-400 line-clamp-1">
                            {track.artist}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-mono text-zinc-400">
                          {formatTime(track.duration)}
                        </span>
                        {track.album && (
                          <span className="block text-[10px] text-zinc-400 mt-0.5 max-w-[100px] truncate">
                            {track.album}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </main>
      </div>

      {/* Persistent Bottom Audio Player Bar */}
      <footer className="flex h-20 shrink-0 items-center justify-between border-t border-zinc-800/80 bg-zinc-900/95 px-6 backdrop-blur-md">
        {/* Track Info */}
        <div className="flex items-center gap-3 w-1/4">
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-zinc-800 border border-zinc-700/60">
            {activeTrack?.cover_url ? (
              <Image
                src={activeTrack.cover_url}
                alt={activeTrack.title}
                fill
                sizes="48px"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Music2 className="h-5 w-5 text-emerald-400" />
              </div>
            )}
          </div>
          <div className="truncate">
            <p className="text-sm font-medium text-zinc-100 truncate">
              {activeTrack?.title ?? "No track selected"}
            </p>
            <p className="text-xs text-zinc-400 truncate">
              {activeTrack?.artist ?? "Choose a track above"}{" "}
              {activeTrack?.album ? `• ${activeTrack.album}` : ""}
            </p>
          </div>
        </div>

        {/* Player Controls */}
        <div className="flex flex-col items-center gap-1.5 w-2/4 max-w-md">
          <div className="flex items-center gap-4">
            <button
              onClick={playPrevious}
              disabled={!activeTrack}
              className="text-zinc-400 transition-colors hover:text-zinc-200 disabled:opacity-40"
              title="Previous Track (Restart if > 3s)"
            >
              <SkipBack className="h-4 w-4" />
            </button>
            <button
              onClick={togglePlay}
              disabled={!activeTrack}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20 transition-all hover:bg-emerald-400 hover:scale-105 active:scale-95 disabled:opacity-40"
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4 fill-zinc-950" />
              ) : (
                <Play className="h-4 w-4 fill-zinc-950 ml-0.5" />
              )}
            </button>
            <button
              onClick={playNext}
              disabled={!activeTrack}
              className="text-zinc-400 transition-colors hover:text-zinc-200 disabled:opacity-40"
              title="Next Track"
            >
              <SkipForward className="h-4 w-4" />
            </button>
          </div>

          {/* Scrubber */}
          <div className="flex w-full items-center gap-2 text-xs font-mono text-zinc-400">
            <span className="w-9 text-right">{formatTime(currentTime)}</span>
            <div
              onClick={handleScrub}
              className="group relative h-2 flex-1 rounded-full bg-zinc-800 overflow-hidden cursor-pointer flex items-center"
            >
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-violet-500 rounded-full transition-[width] duration-75"
                style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
              />
            </div>
            <span className="w-9">{formatTime(totalDuration)}</span>
          </div>
        </div>

        {/* Volume & Aux controls */}
        <div className="hidden sm:flex items-center justify-end gap-3 w-1/4">
          <button
            onClick={() => setVolume(volume > 0 ? 0 : 0.8)}
            className="text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            {volume === 0 ? (
              <VolumeX className="h-4 w-4 text-zinc-500" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </button>
          <div className="flex items-center w-24">
            <label htmlFor={volumeSliderId} className="sr-only">
              Volume
            </label>
            <input
              id={volumeSliderId}
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
          </div>
        </div>
      </footer>
    </div>
  );
}
