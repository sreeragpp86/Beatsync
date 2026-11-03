"use client";

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
  const { isLiked, toggleLike } = useLikesStore();
  const liked = isLiked(trackId);

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
            ? "text-rose-500 fill-rose-500 scale-110 drop-shadow-[0_0_8px_rgba(244,63,94,0.35)]"
            : "text-zinc-400 hover:text-white hover:scale-105"
        }`}
      />
    </button>
  );
}

export default LikeButton;
