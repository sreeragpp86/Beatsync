# SoundWave

SoundWave is a lightweight, high-performance music streaming web application built with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, **Zustand**, and **Supabase**. It features a decoupled, persistent audio engine that guarantees uninterrupted playback across page navigations, smooth byte-range seeking, and zero-egress audio asset delivery.

---

## Features

- **Persistent Audio Engine**: Decoupled HTML5 audio singleton managed via a global Zustand store. Audio never stutters or resets during client-side route transitions.
- **Uninterrupted Queue System**: Full playlist orchestration with continuous playback, auto-advance on track completion, and intuitive queue navigation (Next / Previous / Seek).
- **Sub-Second Audio Scrubbing**: Leverages HTTP Range requests for instant scrubbing without downloading full media files or stuttering during user drag.
- **Responsive Player Bar**: Fixed, hardware-accelerated playback dock featuring track artwork, real-time timeline scrubber, elapsed/total counters, and volume controls.
- **Dynamic Search & Filtering**: Client-side instant search across track titles, albums, and artist metadata.
- **Zero-Egress Asset Pipeline**: Architected to pull streaming audio from S3-compatible object storage (Cloudflare R2 or Supabase Storage) with zero egress fees.
- **Fail-Safe Development Mode**: Bundled with royalty-free fallback tracks so the player works out of the box even before remote databases or buckets are configured.

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Framework** | Next.js 16 (App Router) | Server-side rendering, routing, and asset optimization |
| **Language** | TypeScript | Strict type safety across audio payloads and API models |
| **Styling** | Tailwind CSS v4 | High-contrast, dark-mode-first modular UI |
| **State Management** | Zustand | Reactive global audio store and player singleton |
| **Database & Auth** | Supabase (PostgreSQL) | Relational track catalog and playlist records |
| **Object Storage** | Cloudflare R2 / Supabase | Audio binary streaming with HTTP byte-range support |
| **Icons** | Lucide React | Minimalist UI controls |

---

## Architecture Overview

```text
┌────────────────────────────────────────────────────────────────────────┐
│                            Next.js Client                              │
│  ┌─────────────────────────┐              ┌─────────────────────────┐  │
│  │  Track Browser / Cards  │              │   Persistent PlayerBar  │  │
│  └────────────┬────────────┘              └────────────▲────────────┘  │
│               │                                        │               │
│               ▼                                        │               │
│        Zustand Audio Store ────────────────────────────┘               │
│        (Audio Singleton / HTML5 Audio Engine)                          │
└───────────────────────┬────────────────────────┬───────────────────────┘
                        │                        │
                        ▼                        ▼
               Supabase (PostgreSQL)    Cloudflare R2 / Storage Bucket
               (Track Metadata & URLs)  (Byte-Range Audio Streams)
```

---

## Getting Started

### Prerequisites

- **Node.js** 18.17+ or later
- **npm**, **pnpm**, or **yarn**
- A free [Supabase](https://supabase.com) account *(optional — app runs offline on mock tracks if not configured)*

### 1. Clone & Install

```bash
git clone https://github.com/sreeragpp86/Beatsync.git
cd Beatsync
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in your Supabase project credentials (if left blank, the app runs gracefully on bundled mock tracks):

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Database Schema

If using Supabase, run the following SQL migration in your project's **SQL Editor**:

```sql
create table public.tracks (
  id text primary key,
  title text not null,
  artist text not null,
  album text,
  duration integer not null, -- duration in seconds
  cover_url text,            -- public image URL
  audio_url text not null,   -- streaming link (.mp3)
  created_at timestamptz default now() not null
);

-- Enable public read access (Row Level Security)
alter table public.tracks enable row level security;

create policy "Allow public read access"
  on public.tracks
  for select
  using (true);
```

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

---

## Project Structure

```text
├── app/
│   ├── globals.css          # Tailwind base styles and dark theme tokens
│   ├── layout.tsx           # Root shell with persistent <PlayerBar /> dock
│   └── page.tsx             # Track discovery catalog, hero banner, search bar
├── components/
│   └── PlayerBar.tsx        # Bottom fixed player with controls and scrubber
├── lib/
│   ├── mock-tracks.ts       # Royalty-free audio seed data for offline dev
│   ├── supabase.ts          # Supabase client instantiation with fallback
│   └── tracks.ts            # Hybrid data access layer (remote + fallback)
├── stores/
│   └── useAudioStore.ts     # Headless audio engine singleton & Zustand store
└── types/
    └── track.ts             # Core TypeScript interfaces
```

---

## Roadmap

- [ ] **Web Audio API Visualizer**: Real-time frequency spectrum analysis using `<canvas>`.
- [ ] **Synced Listening Rooms**: Real-time multi-listener room sync using WebSockets.
- [ ] **Track Uploader**: Direct-to-bucket signed upload endpoint with automated duration parsing via Web Audio API.
- [ ] **Offline PWA Caching**: Service Worker audio caching for offline playback via Cache Storage API.

---

## License

MIT © [Sreerag P P](https://github.com/sreeragpp86)
