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
  Disc3,
} from "lucide-react";
import { useLikesStore } from "@/stores/useLikesStore";
import { useAudioStore } from "@/stores/useAudioStore";
import { ThemeToggle } from "@/components/ThemeToggle";
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
    <aside className="hidden md:flex w-[240px] shrink-0 flex-col gap-3 select-none h-full">
      {/* Top Box: Branding & Main Navigation */}
      <div className="bg-[var(--bg-surface)] shadow-raised-sm rounded-2xl p-5 flex flex-col gap-5">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--bg-surface)] shadow-raised-sm group-hover:shadow-raised text-[var(--text-primary)] transition-all">
            <Activity className="h-5 w-5 stroke-[2.5] text-[#E07A5F]" />
          </div>
          <span className="font-extrabold text-xl tracking-tight text-[var(--text-primary)]">
            BeatSync
          </span>
        </Link>

        {/* Primary Nav Links */}
        <nav className="flex flex-col gap-2 pt-1">
          <Link
            href="/"
            className={`flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              pathname === "/"
                ? "shadow-sunken-sm text-[var(--text-primary)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:shadow-raised-sm"
            }`}
          >
            <Home className="h-5 w-5 shrink-0" />
            <span>Home</span>
          </Link>

          <Link
            href="/search"
            className={`flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              pathname === "/search"
                ? "shadow-sunken-sm text-[var(--text-primary)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:shadow-raised-sm"
            }`}
          >
            <Search className="h-5 w-5 shrink-0" />
            <span>Search</span>
          </Link>
        </nav>
      </div>

      {/* Bottom Box: Your Library */}
      <div className="bg-[var(--bg-surface)] shadow-raised-sm rounded-2xl p-4 flex-1 flex flex-col overflow-hidden">
        {/* Library Header */}
        <div className="flex items-center justify-between px-2 py-1 text-[var(--text-secondary)]">
          <div className="flex items-center gap-2.5">
            <Library className="h-5 w-5 shrink-0" />
            <span className="font-bold text-sm text-[var(--text-primary)]">Your Library</span>
          </div>
          <button
            onClick={() => toast.info("Custom playlist creation coming soon!")}
            aria-label="Create playlist or folder"
            className="rounded-full p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:shadow-raised-sm active:shadow-sunken-sm transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Library List */}
        <div className="mt-3 flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
          {/* Liked Songs Tile */}
          <Link
            href="/liked"
            className={`flex items-center gap-3.5 p-2 rounded-xl transition-all cursor-pointer ${
              pathname === "/liked"
                ? "shadow-sunken-sm text-[var(--text-primary)]"
                : "hover:shadow-raised-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--bg-surface)] shadow-sunken-sm text-[#E07A5F]">
              <Heart className="h-5 w-5 fill-[#E07A5F]" />
            </div>
            <div className="min-w-0 flex-1 truncate">
              <p
                className={`text-sm font-semibold truncate ${
                  pathname === "/liked" ? "text-[var(--text-primary)] font-bold" : "text-[var(--text-primary)]"
                }`}
              >
                Liked Songs
              </p>
              <p className="text-xs text-[var(--text-secondary)] truncate mt-0.5">
                Playlist • {likedCount} {likedCount === 1 ? "song" : "songs"}
              </p>
            </div>
          </Link>

          {/* Quick Playlists */}
          {quickPlaylists.map((pl, idx) => (
            <Link
              key={idx}
              href={pl.href}
              className="flex items-center gap-3.5 p-2 rounded-xl transition-all hover:shadow-raised-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] group cursor-pointer"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--bg-surface)] shadow-sunken-sm text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                <Disc3 className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1 truncate">
                <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                  {pl.title}
                </p>
                <p className="text-xs text-[var(--text-secondary)] truncate mt-0.5">
                  {pl.subtitle}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {/* Theme Toggle & Engine Status at bottom of library */}
        <div className="mt-auto pt-4 flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-medium text-[var(--text-secondary)]">Theme</span>
            <ThemeToggle />
          </div>

          <div className="px-1 text-[11px] text-[var(--text-secondary)] flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Engine Online
            </span>
            <span className="font-mono">{queue.length} in queue</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
