"use client";

import { useState, useEffect } from "react";
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
    queue,
    queueIndex,
    setQueue,
    playTrack,
    togglePlay,
  } = useAudioStore();

  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"explore" | "library" | "radio">(
    "explore"
  );

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

  const handleTrackSelect = (track: Track, index: number) => {
    if (queue.length === 0 || queue !== tracks) {
      setQueue(tracks, index);
    } else {
      playTrack(track);
    }
  };

  return (
    <div className="flex flex-col min-h-full bg-zinc-950 text-zinc-100 font-sans">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between border-b border-zinc-800/80 bg-zinc-950/80 px-6 backdrop-blur-md">
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
              Click any track to stream instantly. The persistent player bar at the bottom provides scrubbing, volume control, and auto-advance.
            </p>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 p-6 md:p-8">
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
                    if (tracks.length > 0) setQueue(tracks, 0);
                  }}
                  disabled={tracks.length === 0}
                  className="flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800/80 px-4 py-2.5 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-800 hover:text-white disabled:opacity-50 cursor-pointer"
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
    </div>
  );
}
