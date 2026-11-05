"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function InstallPrompt({ className = "" }: { className?: string }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    // Check if the app is already installed/running in standalone mode
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone;

    if (isStandalone) {
      setIsInstallable(false);
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent browser default mini-infobar on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setIsInstallable(false);
        setDeferredPrompt(null);
      }
    } catch (err) {
      console.warn("[BeatSync PWA] Install prompt error:", err);
    }
  };

  if (!isInstallable || !deferredPrompt) {
    return null;
  }

  return (
    <button
      onClick={handleInstallClick}
      type="button"
      aria-label="Install BeatSync App"
      title="Install BeatSync as a Desktop/Mobile App"
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--bg-surface)] shadow-raised-sm active:shadow-sunken-sm text-xs font-semibold text-[var(--text-primary)] hover:scale-105 transition-all cursor-pointer select-none shrink-0 ${className}`}
    >
      <Download className="h-3.5 w-3.5 text-[#E07A5F]" />
      <span>Install App</span>
    </button>
  );
}

export default InstallPrompt;
