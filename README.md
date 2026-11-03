# BeatSync

BeatSync is a lightweight, high-performance music streaming web application built with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, **Zustand**, and **Supabase**. It features a decoupled, persistent audio engine that guarantees uninterrupted playback across page navigations, smooth byte-range seeking, and zero-egress audio asset delivery.

---

## Features

- **Persistent Audio Engine**: Decoupled HTML5 audio singleton managed via a global Zustand store. Audio never stutters or resets during client-side route transitions.
- **Uninterrupted Queue System**: Full playlist orchestration with continuous playback, auto-advance on track completion, and intuitive queue navigation (Next / Previous / Seek).
- **Automatic Smart Queue & Up Next Drawer**: Dynamic queue generation based on artist, genre, and album similarity, with a slide-over drawer allowing instant track skipping and queue clearing.
- **Sub-Second Audio Scrubbing**: Leverages HTTP Range requests for instant scrubbing without downloading full media files or stuttering during user drag.
- **Liked Songs & Persistent Favorites**: Save tracks with optimistic state updates, persisted across sessions in `localStorage` and synchronized in the background to Supabase.
- **Responsive Player Bar**: Fixed, hardware-accelerated playback dock featuring track artwork, real-time timeline scrubber, elapsed/total counters, and volume controls.
- **Dynamic Search & Filtering**: Client-side debounced instant search across track titles, albums, and artist metadata with `/api/search`.
- **Audio Error Recovery & Toast Alerts**: Catches streaming errors (CORS, 404s, network timeouts) gracefully, alerts the user, and automatically advances to the next track in the queue.
- **Automated Database Seeder**: Built-in CLI seeder script (`npm run seed`) populating Supabase with royalty-free public domain tracks and Unsplash artwork.
- **Fail-Safe Development Mode**: Bundled with 12 royalty-free fallback tracks so the player works out of the box even before remote databases are configured.

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

### 3. Database Schema & Seeder

If using Supabase, run the migrations located in `supabase/migrations/`:

```sql
-- 1. Tracks table
create table public.tracks (
  id text primary key,
  title text not null,
  artist text not null,
  genre text,
  album text,
  duration integer not null, -- duration in seconds
  cover_url text,            -- public image URL
  audio_url text not null,   -- streaming link (.mp3)
  created_at timestamptz default now() not null
);

alter table public.tracks enable row level security;
create policy "Allow public read access" on public.tracks for select using (true);
create policy "Allow public insert access" on public.tracks for insert with check (true);

-- 2. Liked Tracks table
create table public.liked_tracks (
  id uuid primary key default gen_random_uuid(),
  track_id text references public.tracks(id) on delete cascade,
  user_identifier text not null,
  created_at timestamptz default now() not null,
  unique (track_id, user_identifier)
);

alter table public.liked_tracks enable row level security;
create policy "Allow public read access" on public.liked_tracks for select using (true);
create policy "Allow public insert access" on public.liked_tracks for insert with check (true);
create policy "Allow public delete access" on public.liked_tracks for delete using (true);
```

Then seed your Supabase database with 12 royalty-free masterworks:

```bash
npm run seed
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
│   ├── api/search/route.ts  # Track search endpoint with fuzzy matching
│   ├── globals.css          # Tailwind base styles and dark theme tokens
│   ├── layout.tsx           # Root shell with persistent <PlayerBar /> dock
│   ├── liked/page.tsx       # Dedicated Liked Songs page with Play All
│   └── page.tsx             # Discovery feed, hero banner, search bar, view toggle
├── components/
│   ├── LikeButton.tsx       # Interactive animated heart button
│   ├── Navbar.tsx           # Top navigation and connection status
│   ├── PlayerBar.tsx        # Bottom fixed player with controls and scrubber
│   ├── QueueDrawer.tsx      # Slide-over Up Next playlist drawer
│   ├── SearchBar.tsx        # Debounced instant search bar
│   ├── Sidebar.tsx          # Desktop navigation & audio engine status widget
│   ├── Toast.tsx            # Floating error/notification alert
│   ├── TrackCard.tsx        # Grid card with hover playback trigger
│   └── TrackTable.tsx       # High-density playlist table
├── lib/
│   ├── mock-tracks.ts       # 12 royalty-free audio seed tracks for offline dev
│   ├── supabase.ts          # Supabase client instantiation with fallback
│   └── tracks.ts            # Hybrid data access layer (remote + fallback)
├── scripts/
│   └── seed.ts              # Supabase database seeder script
├── stores/
│   ├── useAudioStore.ts     # Headless audio engine singleton & auto-queue
│   └── useLikesStore.ts     # Persisted favorites store with Supabase sync
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
