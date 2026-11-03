"use client";

import { useEffect, useState } from "react";
import { AlertCircle, X } from "lucide-react";
import { useAudioStore } from "@/stores/useAudioStore";

export function Toast() {
  const [mounted, setMounted] = useState(false);
  const { toastMessage, setToastMessage } = useAudioStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!toastMessage) return;

    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 4500);

    return () => clearTimeout(timer);
  }, [toastMessage, setToastMessage]);

  if (!mounted || !toastMessage) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed bottom-[96px] right-4 sm:right-6 z-50 max-w-sm rounded-lg border border-[#282828] bg-[#181818] p-3.5 shadow-2xl backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 flex items-center gap-3 text-white"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#1DB954]/15 text-[#1DB954]">
        <AlertCircle className="h-4 w-4" />
      </div>

      <div className="flex-1 text-xs font-semibold leading-relaxed">
        {toastMessage}
      </div>

      <button
        onClick={() => setToastMessage(null)}
        aria-label="Dismiss notification"
        className="rounded-md p-1 text-[#B3B3B3] transition-colors hover:bg-[#282828] hover:text-white"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export default Toast;
