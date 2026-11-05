import Link from "next/link";
import { Disc3, Slash, Home, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-full px-4 sm:px-6 py-12 sm:py-16 bg-[var(--bg-surface)] select-none text-center animate-in fade-in duration-300 max-w-full overflow-hidden">
      {/* Broken Vinyl Record Icon */}
      <div className="relative flex items-center justify-center mb-6 sm:mb-8">
        {/* Vinyl Disc Container */}
        <div
          className="relative flex h-28 w-28 sm:h-32 sm:w-32 items-center justify-center bg-[var(--bg-surface)] shadow-sunken overflow-hidden"
          style={{ borderRadius: "9999px" }}
        >
          {/* Disc3 Vinyl Icon */}
          <Disc3 className="h-14 w-14 sm:h-16 sm:w-16 text-[var(--text-secondary)] stroke-[1.75]" />

          {/* Fractured Slash Overlay across the Vinyl Disc */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Slash className="h-24 w-24 sm:h-28 sm:w-28 text-[#E07A5F] stroke-[2.5]" />
          </div>

          {/* Center Spindle Hole */}
          <div
            className="absolute h-4 w-4 bg-[var(--bg-surface)] shadow-raised-sm"
            style={{ borderRadius: "9999px" }}
          />
        </div>

        {/* 404 Status Pill */}
        <span className="absolute -top-1 -right-1 rounded-full bg-[var(--bg-surface)] shadow-raised-sm px-2.5 py-0.5 text-[11px] font-mono font-bold text-[#E07A5F]">
          404
        </span>
      </div>

      {/* Heading & Subtext */}
      <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-[var(--text-primary)] tracking-tight px-2">
        Track Not Found
      </h1>
      <p className="mt-2.5 sm:mt-3 text-xs sm:text-base text-[var(--text-secondary)] max-w-sm sm:max-w-md mx-auto leading-relaxed px-4">
        The song or page you&apos;re looking for doesn&apos;t exist or has moved.
      </p>

      {/* Action Buttons */}
      <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto max-w-xs sm:max-w-none">
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--bg-surface)] text-[var(--text-primary)] font-bold px-7 py-3 sm:py-3.5 text-sm shadow-raised-sm active:shadow-sunken-sm hover:scale-105 transition-all cursor-pointer w-full sm:w-auto"
        >
          <Home className="h-4 w-4 stroke-[2.5]" />
          <span>Back to Home</span>
        </Link>

        <Link
          href="/search"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-semibold px-6 py-3 sm:py-3.5 text-sm shadow-raised-sm active:shadow-sunken-sm hover:scale-105 transition-all cursor-pointer w-full sm:w-auto"
        >
          <Search className="h-4 w-4" />
          <span>Search Catalog</span>
        </Link>
      </div>
    </div>
  );
}
