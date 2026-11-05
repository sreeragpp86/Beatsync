"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Headphones, CheckCircle2, AlertCircle, Heart, Compass } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase";
import { useLikesStore } from "@/stores/useLikesStore";
import { InstallPrompt } from "@/components/InstallPrompt";

export function Navbar() {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const { likedTrackIds } = useLikesStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  const likedCount = mounted ? likedTrackIds.length : 0;

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between bg-[var(--bg-surface)] px-4 md:px-8 shadow-raised-sm">
      {/* Brand Logo */}
      <div className="flex items-center gap-6">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--bg-surface)] shadow-raised-sm text-[var(--text-primary)] group-hover:scale-105 transition-transform">
            <Headphones className="h-5 w-5 text-[#E07A5F] stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight text-[var(--text-primary)]">
                BeatSync
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">Stream in ultra-clean audio</p>
          </div>
        </Link>

        {/* Mobile / Tablet Horizontal Links */}
        <nav className="flex md:hidden items-center gap-1">
          <Link
            href="/"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              pathname === "/"
                ? "shadow-sunken-sm text-[var(--text-primary)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Compass className="h-3.5 w-3.5" />
            <span>Discover</span>
          </Link>
          <Link
            href="/liked"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              pathname === "/liked"
                ? "shadow-sunken-sm text-[var(--text-primary)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Heart
              className={`h-3.5 w-3.5 text-[#E07A5F] ${
                pathname === "/liked" ? "fill-[#E07A5F]" : ""
              }`}
            />
            <span>Liked</span>
            {likedCount > 0 && (
              <span className="rounded-full bg-[#E07A5F] px-1.5 text-[9px] font-mono text-white">
                {likedCount}
              </span>
            )}
          </Link>
        </nav>
      </div>

      {/* Right Controls: Install Prompt & Supabase Status */}
      <div className="flex items-center gap-3">
        <InstallPrompt />

        {/* Supabase status badge */}
        <div className="flex items-center gap-2 rounded-full bg-[var(--bg-surface)] shadow-sunken-sm px-3.5 py-1.5 text-xs text-[var(--text-secondary)]">
          {isSupabaseConfigured ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <span className="hidden sm:inline">Supabase Connected</span>
              <span className="sm:hidden">Connected</span>
            </>
          ) : (
            <>
              <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-[var(--text-secondary)]">
                Supabase:{" "}
                <span className="text-[var(--text-primary)] font-mono">Mock Fallback</span>
              </span>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export default Navbar;
