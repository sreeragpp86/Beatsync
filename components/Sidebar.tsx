"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Heart, Radio, Sparkles } from "lucide-react";
import { useAudioStore } from "@/stores/useAudioStore";
import { useLikesStore } from "@/stores/useLikesStore";

export function Sidebar() {
  const pathname = usePathname();
  const { queueIndex, isPlaying, queue } = useAudioStore();
  const { likedTrackIds } = useLikesStore();

  const navLinks = [
    {
      name: "Discover",
      href: "/",
      icon: Compass,
      isActive: pathname === "/",
    },
    {
      name: "Liked Songs",
      href: "/liked",
      icon: Heart,
      isActive: pathname === "/liked",
      badge: likedTrackIds.length > 0 ? likedTrackIds.length : null,
      badgeColor: "bg-rose-500/20 text-rose-400 border border-rose-500/30",
    },
    {
      name: "Radio",
      href: "/#radio",
      icon: Radio,
      isActive: false,
    },
  ];

  return (
    <aside className="hidden w-64 flex-col justify-between border-r border-zinc-800/80 bg-zinc-900/30 p-4 md:flex shrink-0 select-none">
      <div className="space-y-6">
        {/* Navigation Section */}
        <div className="space-y-1">
          <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            Menu
          </p>

          {navLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                  item.isActive
                    ? "bg-zinc-800/90 text-emerald-400 shadow-sm border border-zinc-700/50"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`h-4 w-4 ${
                      item.name === "Liked Songs" && item.isActive
                        ? "text-rose-400 fill-rose-400"
                        : ""
                    }`}
                  />
                  <span>{item.name}</span>
                </div>

                {item.badge !== null && item.badge !== undefined && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-mono font-semibold ${item.badgeColor}`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Audio Engine Status Widget */}
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
              <span>Queue Length</span>
              <span className="text-emerald-400 font-mono">
                {queue.length} tracks
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

      {/* Footer Info */}
      <div className="rounded-lg bg-zinc-900/80 p-3 text-xs text-zinc-400 border border-zinc-800">
        <p className="text-zinc-300 font-medium">SoundWave Audio</p>
        <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
          Playback stays active across all navigation. Up Next queue and favorites sync automatically.
        </p>
      </div>
    </aside>
  );
}

export default Sidebar;
