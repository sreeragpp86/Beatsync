"use client";

import { useState, useEffect } from "react";
import { Heart } from "lucide-react";
import { Track } from "@/types/track";
import { useLikesStore } from "@/stores/useLikesStore";

export interface LikeButtonProps {
  track?: Track;
  trackId?: string;
  size?: number;
  className?: string;
}

export function LikeButton({
  track,
  trackId,
  size = 18,
  className = "",
}: LikeButtonProps) {
  const [mounted, setMounted] = useState(false);
  const [isPopping, setIsPopping] = useState(false);
  const { isLiked, toggleLike } = useLikesStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  const effectiveId = track?.id || trackId || "";
  const liked = mounted && effectiveId ? isLiked(effectiveId) : false;

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Stop propagation so clicking does not trigger parent track playback
    e.stopPropagation();
    e.preventDefault();

    if (!effectiveId) return;

    // Trigger spring pop animation
    setIsPopping(true);
    setTimeout(() => setIsPopping(false), 240);

    if (track) {
      toggleLike(track);
    } else {
      toggleLike(effectiveId);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={liked ? "Remove from Liked Songs" : "Save to Liked Songs"}
      title={liked ? "Remove from Liked Songs" : "Save to Liked Songs"}
      className={`group relative flex items-center justify-center rounded-xl bg-[var(--bg-surface)] p-2 transition-all duration-150 cursor-pointer select-none shrink-0 ${
        liked
          ? "shadow-sunken-sm"
          : "shadow-raised-sm hover:scale-105 active:shadow-sunken-sm"
      } ${className}`}
    >
      <Heart
        size={size}
        className={`transition-all duration-200 ease-out transform ${
          isPopping ? "scale-120 rotate-[-6deg]" : "scale-100 rotate-0"
        } ${
          liked
            ? "text-[#E07A5F] dark:text-[#F472B6] fill-[#E07A5F] dark:fill-[#F472B6]"
            : "text-[var(--text-secondary)] fill-transparent group-hover:text-[var(--text-primary)]"
        }`}
      />
    </button>
  );
}

export default LikeButton;
