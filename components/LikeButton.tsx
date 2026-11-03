"use client";

import { useState, useEffect } from "react";
import { Heart } from "lucide-react";
import { useLikesStore } from "@/stores/useLikesStore";

export interface LikeButtonProps {
  trackId: string;
  size?: number;
  className?: string;
}

export function LikeButton({
  trackId,
  size = 16,
  className = "",
}: LikeButtonProps) {
  const [mounted, setMounted] = useState(false);
  const { isLiked, toggleLike } = useLikesStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  const liked = mounted ? isLiked(trackId) : false;

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.preventDefault();
    toggleLike(trackId);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={liked ? "Unlike song" : "Like song"}
      title={liked ? "Remove from Liked Songs" : "Save to Liked Songs"}
      className={`group relative p-1.5 rounded-full transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rose-500 cursor-pointer ${className}`}
    >
      <Heart
        size={size}
        className={`transition-all duration-200 ${
          liked
            ? "text-[#1DB954] fill-[#1DB954] scale-110 drop-shadow-[0_0_8px_rgba(29,185,84,0.4)]"
            : "text-[#B3B3B3] hover:text-white hover:scale-105"
        }`}
      />
    </button>
  );
}

export default LikeButton;
