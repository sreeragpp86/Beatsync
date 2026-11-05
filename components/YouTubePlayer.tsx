"use client";

import { useEffect } from "react";
import { ytPlayerService } from "@/lib/youtube-player";

/**
 * Invisible YouTube IFrame mount point.
 * Positioned offscreen (fixed -left-[9999px]) with 200x200 dimensions to prevent
 * modern mobile/desktop browsers from throttling or suspending background audio.
 */
export function YouTubePlayer() {
  useEffect(() => {
    ytPlayerService.initPlayer("beatsync-yt-iframe");
  }, []);

  return (
    <div
      id="beatsync-yt-container"
      className="fixed -left-[9999px] -top-[9999px] w-[200px] h-[200px] opacity-0 pointer-events-none -z-50 select-none"
      aria-hidden="true"
    >
      <div id="beatsync-yt-iframe" />
    </div>
  );
}
