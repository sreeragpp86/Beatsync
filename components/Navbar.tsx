"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Headphones, CheckCircle2, AlertCircle, Heart, Compass } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase";
import { useLikesStore } from "@/stores/useLikesStore";

export function Navbar() {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const { likedTrackIds } = useLikesStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  const likedCount = mounted ? likedTrackIds.length : 0;

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between border-b border-zinc-800/80 bg-zinc-950/80 px-4 md:px-8 backdrop-blur-md">
      {/* Brand Logo */}
      <div className="flex items-center gap-6">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-violet-600 text-zinc-950 shadow-lg shadow-emerald-500/10 group-hover:scale-105 transition-transform">
            <Headphones className="h-5 w-5 text-zinc-950 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-zinc-100 via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
                BeatSync
              </span>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                MVP
              </span>
            </div>
            <p className="text-xs text-zinc-400">Stream in ultra-clean audio</p>
          </div>
        </Link>

        {/* Mobile / Tablet Horizontal Links */}
        <nav className="flex md:hidden items-center gap-1">
          <Link
            href="/"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              pathname === "/"
                ? "bg-zinc-800 text-emerald-400"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Compass className="h-3.5 w-3.5" />
            <span>Discover</span>
          </Link>
          <Link
            href="/liked"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              pathname === "/liked"
                ? "bg-zinc-800 text-rose-400"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Heart
              className={`h-3.5 w-3.5 ${
                pathname === "/liked" ? "fill-rose-400" : ""
              }`}
            />
            <span>Liked</span>
            {likedCount > 0 && (
              <span className="rounded-full bg-rose-500/20 px-1.5 text-[9px] font-mono text-rose-400">
                {likedCount}
              </span>
            )}
          </Link>
        </nav>
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
  );
}

export default Navbar;
