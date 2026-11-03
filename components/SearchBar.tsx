"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X, Loader2 } from "lucide-react";

export interface SearchBarProps {
  initialValue?: string;
  onSearch: (query: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
  debounceMs?: number;
}

export function SearchBar({
  initialValue = "",
  onSearch,
  isLoading = false,
  placeholder = "Search tracks by title, artist, or album...",
  className = "",
  debounceMs = 300,
}: SearchBarProps) {
  const [inputValue, setInputValue] = useState(initialValue);
  const onSearchRef = useRef(onSearch);
  const isFirstRender = useRef(true);

  useEffect(() => {
    onSearchRef.current = onSearch;
  }, [onSearch]);

  // Keep input synchronized if parent updates initialValue externally
  useEffect(() => {
    setInputValue(initialValue);
  }, [initialValue]);

  // Client-side debounce (300ms)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const timer = setTimeout(() => {
      onSearchRef.current(inputValue.trim());
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [inputValue, debounceMs]);

  const handleClear = () => {
    setInputValue("");
    onSearchRef.current("");
  };

  return (
    <div className={`relative flex items-center ${className}`}>
      {/* Search Icon */}
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />

      {/* Styled Dark Theme Input */}
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder={placeholder}
        className="w-full h-10 pl-10 pr-14 rounded-xl border border-zinc-800 bg-zinc-900/70 text-sm text-zinc-100 placeholder-zinc-500 shadow-inner focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/40 transition-colors"
      />

      {/* Right Controls: Loading Spinner & Clear Button */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
        {isLoading && (
          <Loader2
            className="h-4 w-4 animate-spin text-emerald-400"
            aria-label="Searching..."
          />
        )}
        {inputValue && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear search query"
            className="rounded p-0.5 text-zinc-400 hover:text-zinc-200 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-400 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export default SearchBar;
