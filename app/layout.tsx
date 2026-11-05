import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { PlayerBar } from "@/components/PlayerBar";
import { MobileNav } from "@/components/MobileNav";
import { KeyboardShortcuts } from "@/components/KeyboardShortcuts";
import { YouTubePlayer } from "@/components/YouTubePlayer";
import { NowPlayingModal } from "@/components/NowPlayingModal";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://beatsync.vercel.app"),
  title: "BeatSync — Stream Music for Free",
  description: "Modern, fast, and completely free music streaming web app.",
  keywords: [
    "music streaming",
    "free music",
    "online player",
    "invidious audio",
    "youtube stream",
    "beatsync",
    "web audio",
  ],
  authors: [{ name: "BeatSync Team" }],
  creator: "BeatSync",
  openGraph: {
    title: "BeatSync — Stream Music for Free",
    description: "Modern, fast, and completely free music streaming web app.",
    url: "https://beatsync.vercel.app",
    siteName: "BeatSync",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "BeatSync — Stream Music for Free",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "BeatSync — Stream Music for Free",
    description: "Modern, fast, and completely free music streaming web app.",
    images: ["/og-image.png"],
    creator: "@beatsync",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: ["/favicon.ico"],
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full overflow-hidden bg-[#06060c] text-white selection:bg-[#1DB954] selection:text-black font-sans relative">
        {/* Luminous Ambient Background Mesh for Glassmorphism */}
        <div
          className="fixed inset-0 pointer-events-none overflow-hidden z-0"
          aria-hidden="true"
        >
          {/* Emerald / Cyan upper ambient orb */}
          <div className="ambient-orb ambient-orb-1" />
          {/* Violet / Purple upper-right ambient orb */}
          <div className="ambient-orb ambient-orb-2" />
          {/* Deep Indigo center-lower ambient orb */}
          <div className="ambient-orb ambient-orb-3" />
          {/* Soft Rose / Fuchsia accent orb */}
          <div className="ambient-orb ambient-orb-4" />
          {/* Ambient radial vignette */}
          <div className="absolute inset-0 bg-radial from-transparent via-[#06060c]/40 to-[#06060c]/85" />
        </div>

        {/* Main Application Container with Dynamic Viewport Height for mobile */}
        <div className="relative z-10 flex h-[100dvh] flex-col overflow-hidden bg-transparent">
          {/* Main Workspace (Sidebar + Scrollable Panel) */}
          <div className="flex flex-1 overflow-hidden p-1.5 sm:p-2.5 gap-2.5 pb-0">
            {/* Sidebar */}
            <Sidebar />

            {/* Main Content Glass Panel */}
            <main className="glass-panel flex-1 rounded-xl sm:rounded-2xl overflow-y-auto relative flex flex-col mb-[124px] md:mb-[88px] shadow-2xl">
              {children}
            </main>
          </div>

          {/* Persistent Player Dock (Mini Player on mobile, Full Dock on desktop) */}
          <PlayerBar />

          {/* Fullscreen Expandable Now Playing Modal */}
          <NowPlayingModal />

          {/* Persistent Bottom Navigation for Mobile Devices */}
          <MobileNav />
        </div>

        {/* Client-Side Invisible YouTube Player Bridge for Real Audio Streaming */}
        <YouTubePlayer />

        {/* Global Keyboard Shortcuts (Space, Arrows, Mute) */}
        <KeyboardShortcuts />

        {/* Sonner Toast Notification Center & Vercel Telemetry */}
        <Toaster theme="dark" richColors position="bottom-right" />
        <Analytics />
      </body>
    </html>
  );
}
