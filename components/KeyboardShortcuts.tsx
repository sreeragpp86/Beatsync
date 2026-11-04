"use client";

import { useEffect } from "react";
import { useAudioStore } from "@/stores/useAudioStore";

/**
 * Global Keyboard Shortcuts for BeatSync:
 * - Space: Toggle play/pause (prevent page scroll)
 * - ArrowRight: Seek forward 5 seconds
 * - ArrowLeft: Seek backward 5 seconds
 * - KeyM: Toggle mute
 *
 * Ignores keystrokes when the active focused element is an INPUT or TEXTAREA.
 */
export function KeyboardShortcuts() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;

      // Ignore keystrokes when interacting with text inputs, search fields, textareas, etc.
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      // Space: Toggle play/pause (prevent page scroll)
      if (e.code === "Space" || e.key === " ") {
        e.preventDefault();
        useAudioStore.getState().togglePlay();
        return;
      }

      // ArrowRight: Seek forward 5 seconds
      if (e.code === "ArrowRight" || e.key === "ArrowRight") {
        e.preventDefault();
        const { currentTime, duration, seek } = useAudioStore.getState();
        const maxDuration = duration > 0 ? duration : Infinity;
        seek(Math.min(maxDuration, currentTime + 5));
        return;
      }

      // ArrowLeft: Seek backward 5 seconds
      if (e.code === "ArrowLeft" || e.key === "ArrowLeft") {
        e.preventDefault();
        const { currentTime, seek } = useAudioStore.getState();
        seek(Math.max(0, currentTime - 5));
        return;
      }

      // KeyM: Toggle mute
      if (e.code === "KeyM" || e.key.toLowerCase() === "m") {
        // Only trigger if modifier keys (Cmd, Ctrl, Alt) are not pressed
        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          useAudioStore.getState().toggleMute();
          return;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return null;
}

export default KeyboardShortcuts;
