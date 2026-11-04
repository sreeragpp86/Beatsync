"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Heart, Sparkles } from "lucide-react";
import { useLikesStore } from "@/stores/useLikesStore";

export function MobileNav() {
  const pathname = usePathname();
  const { likedTrackIds } = useLikesStore();

  const navItems = [
    {
      href: "/",
      label: "Home",
      icon: Home,
      isActive: pathname === "/",
    },
    {
      href: "/search",
      label: "Search",
      icon: Search,
      isActive: pathname === "/search",
    },
    {
      href: "/liked",
      label: "Liked",
      icon: Heart,
      isActive: pathname === "/liked",
      badgeCount: likedTrackIds.length,
    },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 flex md:hidden items-center justify-around bg-[#0c0c16]/95 backdrop-blur-2xl border-t border-white/10 px-4 py-2 select-none shadow-[0_-8px_30px_rgba(0,0,0,0.7)]"
      style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = item.isActive;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`group relative flex flex-col items-center justify-center flex-1 py-1 transition-all duration-200 active:scale-95 cursor-pointer ${
              isActive ? "text-white" : "text-[#A1A1AA] hover:text-white"
            }`}
          >
            {/* Active glow pill indicator */}
            {isActive && (
              <span className="absolute -top-2 h-1 w-8 rounded-full bg-[#1DB954] shadow-[0_0_10px_#1DB954]" />
            )}

            <div className="relative">
              <Icon
                className={`h-5 w-5 transition-transform duration-200 group-hover:scale-110 ${
                  isActive ? "text-[#1DB954] stroke-[2.5]" : ""
                }`}
              />
              {Boolean(item.badgeCount && item.badgeCount > 0) && (
                <span className="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-sm">
                  {item.badgeCount}
                </span>
              )}
            </div>

            <span
              className={`text-[11px] font-semibold mt-1 tracking-tight ${
                isActive ? "text-white font-bold" : "text-[#A1A1AA]"
              }`}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

export default MobileNav;
