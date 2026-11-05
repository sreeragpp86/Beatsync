"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { useThemeStore } from "@/stores/useThemeStore";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme, setTheme } = useThemeStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem("beatsync_theme");
      if (saved === "dark" || saved === "light") {
        setTheme(saved);
      } else {
        // Default light theme as requested
        setTheme("light");
      }
    } catch {
      setTheme("light");
    }
  }, [setTheme]);

  const isDark = mounted && theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      type="button"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={`relative inline-flex items-center h-10 w-[78px] rounded-full p-1 bg-[var(--bg-surface)] shadow-sunken transition-colors duration-200 cursor-pointer select-none shrink-0 ${className}`}
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
    >
      {/* Sliding Extruded Button with --shadow-raised-sm */}
      <div
        className={`absolute top-1 bottom-1 w-8 rounded-full bg-[var(--bg-surface)] shadow-raised-sm transition-transform duration-300 ease-out flex items-center justify-center ${
          isDark ? "translate-x-[38px]" : "translate-x-0"
        }`}
      >
        {isDark ? (
          <Moon className="h-4 w-4 text-indigo-400 stroke-[2.2]" />
        ) : (
          <Sun className="h-4 w-4 text-amber-500 stroke-[2.2]" />
        )}
      </div>

      {/* Sun & Moon static background indicator icons */}
      <div className="flex items-center justify-between w-full px-2 text-xs font-medium pointer-events-none">
        <Sun
          className={`h-4 w-4 transition-opacity duration-200 ${
            isDark ? "opacity-35 text-[var(--text-secondary)]" : "opacity-0"
          }`}
        />
        <Moon
          className={`h-4 w-4 transition-opacity duration-200 ${
            isDark ? "opacity-0" : "opacity-35 text-[var(--text-secondary)]"
          }`}
        />
      </div>
    </button>
  );
}

export default ThemeToggle;
