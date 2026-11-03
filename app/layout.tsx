import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { PlayerBar } from "@/components/PlayerBar";

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
  description: "Spotify-inspired high performance music streaming web application.",
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
      <body className="h-full overflow-hidden bg-[#000000] text-white selection:bg-[#1DB954] selection:text-black font-sans">
        {/* Main Application Container */}
        <div className="flex h-screen flex-col overflow-hidden bg-[#000000]">
          {/* Main Workspace (Sidebar + Scrollable Panel) */}
          <div className="flex flex-1 overflow-hidden p-2 gap-2 pb-0">
            {/* Spotify 240px Sidebar */}
            <Sidebar />

            {/* Spotify Main Content Panel */}
            <main className="flex-1 bg-[#121212] rounded-lg overflow-y-auto relative flex flex-col mb-[88px] shadow-2xl">
              {children}
            </main>
          </div>

          {/* Persistent Fixed Bottom Player Dock (88px) */}
          <PlayerBar />
        </div>
      </body>
    </html>
  );
}
