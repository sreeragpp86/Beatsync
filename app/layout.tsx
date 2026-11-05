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
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "BeatSync",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: ["/favicon.ico"],
  },
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="BeatSync" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const stored = localStorage.getItem('beatsync_theme');
                if (stored === 'dark') {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className="h-full overflow-hidden bg-[var(--bg-surface)] text-[var(--text-primary)] transition-colors duration-200 font-sans relative select-none">
        {/* Main Application Container with Dynamic Viewport Height for mobile */}
        <div className="relative z-10 flex h-[100dvh] flex-col overflow-hidden bg-transparent">
          {/* Main Workspace (Sidebar + Scrollable Panel) */}
          <div className="flex flex-1 overflow-hidden p-2 sm:p-3 gap-3 pb-0">
            {/* Sidebar */}
            <Sidebar />

            {/* Main Content Soft Neomorphic Panel */}
            <main className="flex-1 rounded-2xl overflow-y-auto relative flex flex-col mb-[116px] md:mb-[108px] bg-[var(--bg-surface)] shadow-sunken-sm">
              {children}
            </main>
          </div>

          {/* Persistent Player Dock (Mini Player on mobile, Floating Dock on desktop) */}
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
        <Toaster richColors position="bottom-right" />
        <Analytics />
      </body>
    </html>
  );
}
