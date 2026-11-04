"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Search,
  Heart,
  Library,
  Plus,
  Activity,
  Music2,
  Sparkles,
  Disc3,
  Compass,
} from "lucide-react";
import { useLikesStore } from "@/stores/useLikesStore";
import { useAudioStore } from "@/stores/useAudioStore";
import { toast } from "sonner";

export function Sidebar() {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const { likedTrackIds } = useLikesStore();
  const { queue } = useAudioStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  const likedCount = mounted ? likedTrackIds.length : 0;

  const quickPlaylists = [
    { title: "Today's Top Hits", subtitle: "Playlist • BeatSync", href: "/search?q=top+hits" },
    { title: "Chill Lofi Beats", subtitle: "Playlist • BeatSync", href: "/search?q=lo-fi+beats" },
    { title: "Deep Focus Instrumental", subtitle: "Playlist • BeatSync", href: "/search?q=focus+instrumental" },
    { title: "All Out 2000s Hits", subtitle: "Playlist • BeatSync", href: "/search?q=2000s+hits" },
  ];

  return (
    <aside className="hidden md:flex w-[240px] shrink-0 flex-col gap-2 select-none h-full">
      {/* Top Box: Branding & Main Navigation */}
      <div className="bg-[#121212] rounded-lg p-5 flex flex-col gap-5">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1DB954] text-black shadow-lg shadow-[#1DB954]/20 group-hover:scale-105 transition-transform">
            <Activity className="h-5 w-5 stroke-[2.5]" />
          </div>
          <span className="font-bold text-xl tracking-tight text-white">
            BeatSync
          </span>
        </Link>

        {/* Primary Nav Links */}
        <nav className="flex flex-col gap-3 pt-1">
          <Link
            href="/"
            className={`flex items-center gap-4 text-sm font-bold transition-colors ${
              pathname === "/"
                ? "text-white"
                : "text-[#B3B3B3] hover:text-white"
            }`}
          >
            <Home className="h-6 w-6 shrink-0" />
            <span>Home</span>
          </Link>

          <Link
            href="/search"
            className={`flex items-center gap-4 text-sm font-bold transition-colors ${
              pathname === "/search"
                ? "text-white"
                : "text-[#B3B3B3] hover:text-white"
            }`}
          >
            <Search className="h-6 w-6 shrink-0" />
            <span>Search</span>
          </Link>
        </nav>
      </div>

      {/* Bottom Box: Your Library */}
      <div className="bg-[#121212] rounded-lg p-4 flex-1 flex flex-col overflow-hidden">
        {/* Library Header */}
        <div className="flex items-center justify-between px-2 py-1 text-[#B3B3B3] hover:text-white transition-colors cursor-pointer group">
          <div className="flex items-center gap-3">
            <Library className="h-6 w-6 shrink-0 group-hover:text-white transition-colors" />
            <span className="font-bold text-sm">Your Library</span>
          </div>
          <button
            onClick={() => toast.info("Custom playlist creation coming soon!")}
            aria-label="Create playlist or folder"
            className="rounded-full p-1 text-[#B3B3B3] hover:text-white hover:bg-[#282828] transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Library List */}
        <div className="mt-3 flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
          {/* Liked Songs Tile */}
          <Link
            href="/liked"
            className={`flex items-center gap-3.5 p-2 rounded-md transition-colors cursor-pointer ${
              pathname === "/liked"
                ? "bg-[#282828] text-white"
                : "hover:bg-[#1a1a1a] text-[#B3B3B3] hover:text-white"
            }`}
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-gradient-to-br from-indigo-600 via-purple-600 to-rose-400 text-white shadow-md">
              <Heart className="h-5 w-5 fill-white" />
            </div>
            <div className="min-w-0 flex-1 truncate">
              <p
                className={`text-sm font-semibold truncate ${
                  pathname === "/liked" ? "text-[#1DB954]" : "text-white"
                }`}
              >
                Liked Songs
              </p>
              <p className="text-xs text-[#B3B3B3] truncate mt-0.5">
                Playlist • {likedCount} {likedCount === 1 ? "song" : "songs"}
              </p>
            </div>
          </Link>

          {/* Quick Playlists */}
          {quickPlaylists.map((pl, idx) => (
            <Link
              key={idx}
              href={pl.href}
              className="flex items-center gap-3.5 p-2 rounded-md transition-colors hover:bg-[#1a1a1a] text-[#B3B3B3] hover:text-white group cursor-pointer"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-[#282828] text-[#B3B3B3] group-hover:text-white transition-colors">
                <Disc3 className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1 truncate">
                <p className="text-sm font-medium text-white truncate group-hover:text-[#1DB954] transition-colors">
                  {pl.title}
                </p>
                <p className="text-xs text-[#B3B3B3] truncate mt-0.5">
                  {pl.subtitle}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {/* Small Engine Status Pill at bottom of library */}
        <div className="mt-auto pt-3 border-t border-[#282828] px-2 text-[11px] text-[#B3B3B3] flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#1DB954] animate-pulse" />
            Engine Online
          </span>
          <span className="font-mono">{queue.length} in queue</span>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
