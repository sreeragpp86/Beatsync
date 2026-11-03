-- Migration: 01_tracks.sql
-- Table definition and Row Level Security for tracks catalog

create table if not exists public.tracks (
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

drop policy if exists "Allow public read access" on public.tracks;

create policy "Allow public read access"
  on public.tracks
  for select
  using (true);
