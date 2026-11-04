import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { PlayerBar } from "@/components/PlayerBar";
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
  title: "BeatSync - Web Player: Music for everyone",
  description: "Spotify-inspired high performance music streaming web application with modern glassmorphism styling.",
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

        {/* Main Application Container */}
        <div className="relative z-10 flex h-screen flex-col overflow-hidden bg-transparent">
          {/* Main Workspace (Sidebar + Scrollable Panel) */}
          <div className="flex flex-1 overflow-hidden p-2.5 gap-2.5 pb-0">
            {/* Sidebar */}
            <Sidebar />

            {/* Main Content Glass Panel */}
            <main className="glass-panel flex-1 rounded-2xl overflow-y-auto relative flex flex-col mb-[88px] shadow-2xl">
              {children}
            </main>
          </div>

          {/* Persistent Fixed Bottom Player Dock (88px) */}
          <PlayerBar />
        </div>

        {/* Sonner Toast Notification Center & Vercel Telemetry */}
        <Toaster theme="dark" richColors position="bottom-right" />
        <Analytics />
      </body>
    </html>
  );
}
