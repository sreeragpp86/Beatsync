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
  color?: "green" | "red";
}

export function LikeButton({
  track,
  trackId,
  size = 18,
  className = "",
  color = "green",
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
    e.stopPropagation();
    e.preventDefault();

    if (!effectiveId) return;

    // Trigger subtle scale pop animation
    setIsPopping(true);
    setTimeout(() => setIsPopping(false), 220);

    if (track) {
      toggleLike(track);
    } else {
      toggleLike(effectiveId);
    }
  };

  const activeColorClass =
    color === "red"
      ? "text-[#E91429] fill-[#E91429] drop-shadow-[0_0_8px_rgba(233,20,41,0.5)]"
      : "text-[#1DB954] fill-[#1DB954] drop-shadow-[0_0_8px_rgba(29,185,84,0.45)]";

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={liked ? "Remove from Liked Songs" : "Save to Liked Songs"}
      title={liked ? "Remove from Liked Songs" : "Save to Liked Songs"}
      className={`group relative p-1.5 rounded-full transition-transform active:scale-95 focus-visible:outline-none cursor-pointer select-none ${className}`}
    >
      <Heart
        size={size}
        className={`transition-all duration-200 transform ${
          isPopping ? "scale-130 rotate-[-8deg]" : "scale-100 rotate-0"
        } ${
          liked
            ? activeColorClass
            : "text-[#B3B3B3] hover:text-white hover:scale-110"
        }`}
      />
    </button>
  );
}

export default LikeButton;
