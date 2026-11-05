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
    <div className={`relative flex items-center w-full ${className}`}>
      {/* Search Icon */}
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-secondary)] pointer-events-none" />

      {/* Recessed Trench Neomorphic Input */}
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder={placeholder}
        className="w-full h-11 pl-11 pr-14 rounded-2xl bg-[var(--bg-surface)] shadow-sunken border-none text-sm font-medium text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none transition-all"
      />

      {/* Right Controls: Loading Spinner & Clear Button */}
      <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
        {isLoading && (
          <Loader2
            className="h-4 w-4 animate-spin text-[var(--text-secondary)]"
            aria-label="Searching..."
          />
        )}
        {inputValue && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear search query"
            className="rounded-full p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors focus-visible:outline-none cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export default SearchBar;
