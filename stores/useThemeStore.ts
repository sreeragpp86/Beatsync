import { create } from "zustand";

export interface ThemeState {
  theme: "light" | "dark";
  toggleTheme: () => void;
  setTheme: (theme: "light" | "dark") => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: "light",
  toggleTheme: () => {
    const nextTheme = get().theme === "light" ? "dark" : "light";
    get().setTheme(nextTheme);
  },
  setTheme: (theme: "light" | "dark") => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("beatsync_theme", theme);
        if (theme === "dark") {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      } catch (err) {
        console.warn("[BeatSync Theme] Error persisting theme:", err);
      }
    }
    set({ theme });
  },
}));
