-- Migration: 02_likes.sql
-- Table definition and Row Level Security for "Liked Songs" persistence

do $$
declare
  track_id_type text;
begin
  select data_type into track_id_type
  from information_schema.columns
  where table_schema = 'public' and table_name = 'tracks' and column_name = 'id';

  if track_id_type = 'uuid' then
    execute '
      create table if not exists public.liked_tracks (
        id uuid primary key default gen_random_uuid(),
        track_id uuid not null references public.tracks(id) on delete cascade,
        user_identifier text not null,
        created_at timestamptz default now() not null,
        constraint liked_tracks_track_user_unique unique (track_id, user_identifier)
      );
    ';
  else
    execute '
      create table if not exists public.liked_tracks (
        id uuid primary key default gen_random_uuid(),
        track_id text not null references public.tracks(id) on delete cascade,
        user_identifier text not null,
        created_at timestamptz default now() not null,
        constraint liked_tracks_track_user_unique unique (track_id, user_identifier)
      );
    ';
  end if;
end $$;

-- Enable Row Level Security (RLS)
alter table public.liked_tracks enable row level security;

-- Open read/insert/delete policies for MVP
drop policy if exists "Allow read access to liked_tracks" on public.liked_tracks;
create policy "Allow read access to liked_tracks"
  on public.liked_tracks
  for select
  using (true);

drop policy if exists "Allow insert access to liked_tracks" on public.liked_tracks;
create policy "Allow insert access to liked_tracks"
  on public.liked_tracks
  for insert
  with check (true);

drop policy if exists "Allow delete access to liked_tracks" on public.liked_tracks;
create policy "Allow delete access to liked_tracks"
  on public.liked_tracks
  for delete
  using (true);
