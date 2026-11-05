import Link from "next/link";
import { Disc3, Slash, Home, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-full px-4 sm:px-6 py-12 sm:py-16 bg-[#121212] select-none text-center animate-in fade-in duration-300 max-w-full overflow-hidden">
      {/* Broken Vinyl Record Icon */}
      <div className="relative flex items-center justify-center mb-6 sm:mb-8">
        {/* Subtle Ambient Glow */}
        <div className="absolute h-36 w-36 rounded-full bg-radial from-rose-500/20 via-purple-500/5 to-transparent blur-2xl pointer-events-none" />

        {/* Vinyl Disc Container - explicit inline borderRadius overrides global rules */}
        <div
          className="relative flex h-28 w-28 sm:h-32 sm:w-32 items-center justify-center bg-[#14141c] border border-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.8)] overflow-hidden"
          style={{ borderRadius: "9999px" }}
        >
          {/* Outer Vinyl Grooves */}
          <div
            className="absolute inset-2 border border-dashed border-white/10 opacity-60"
            style={{ borderRadius: "9999px" }}
          />
          <div
            className="absolute inset-4 border border-white/5 opacity-40"
            style={{ borderRadius: "9999px" }}
          />

          {/* Disc3 Vinyl Icon */}
          <Disc3 className="h-14 w-14 sm:h-16 sm:w-16 text-[#A1A1AA] stroke-[1.75]" />

          {/* Fractured Slash Overlay across the Vinyl Disc */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Slash className="h-24 w-24 sm:h-28 sm:w-28 text-rose-500 stroke-[2.5] drop-shadow-[0_0_10px_rgba(244,63,94,0.7)]" />
          </div>

          {/* Center Spindle Hole */}
          <div
            className="absolute h-4 w-4 bg-[#0a0a0f] border border-white/20 shadow-inner"
            style={{ borderRadius: "9999px" }}
          />
        </div>

        {/* 404 Status Pill */}
        <span className="absolute -top-1 -right-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 px-2.5 py-0.5 text-[11px] font-mono font-bold text-rose-400 shadow-md">
          404
        </span>
      </div>

      {/* Heading & Subtext */}
      <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight drop-shadow-sm px-2">
        Track Not Found
      </h1>
      <p className="mt-2.5 sm:mt-3 text-xs sm:text-base text-[#B3B3B3] max-w-sm sm:max-w-md mx-auto leading-relaxed px-4">
        The song or page you&apos;re looking for doesn&apos;t exist or has moved.
      </p>

      {/* Action Buttons - Stacked on mobile, side-by-side on tablet/desktop */}
      <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto max-w-xs sm:max-w-none">
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold px-7 py-3 sm:py-3.5 text-sm transition-all duration-200 hover:scale-105 active:scale-95 shadow-xl shadow-[#1DB954]/25 cursor-pointer w-full sm:w-auto"
        >
          <Home className="h-4 w-4 stroke-[2.5]" />
          <span>Back to Home</span>
        </Link>

        <Link
          href="/search"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-white/5 hover:bg-white/10 text-white font-semibold px-6 py-3 sm:py-3.5 text-sm border border-white/10 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer w-full sm:w-auto"
        >
          <Search className="h-4 w-4 text-[#B3B3B3]" />
          <span>Search Catalog</span>
        </Link>
      </div>
    </div>
  );
}
