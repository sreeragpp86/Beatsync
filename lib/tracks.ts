import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { MOCK_TRACKS } from '@/lib/mock-tracks';
import { Track } from '@/types/track';

/**
 * Retrieves track list from Supabase if configured and available.
 * Gracefully falls back to local mock tracks with a non-blocking warning
 * if environment variables are absent, table is missing, or the query fails.
 */
export async function getTracks(): Promise<Track[]> {
  if (!isSupabaseConfigured) {
    console.warn(
      '[SoundWave Tracks] Supabase environment variables are missing or incomplete. Using local mock tracks.'
    );
    return MOCK_TRACKS;
  }

  try {
    const { data, error } = await supabase
      .from('tracks')
      .select('id, title, artist, album, duration, cover_url, audio_url')
      .order('id', { ascending: true });

    if (error) {
      console.warn(
        `[SoundWave Tracks] Supabase query failed: ${error.message} (code: ${error.code}). Falling back to local mock tracks.`
      );
      return MOCK_TRACKS;
    }

    if (!data || data.length === 0) {
      console.warn(
        '[SoundWave Tracks] No records found in Supabase "tracks" table. Falling back to local mock tracks.'
      );
      return MOCK_TRACKS;
    }

    return data as Track[];
  } catch (error) {
    console.warn(
      '[SoundWave Tracks] Unexpected error querying tracks from Supabase. Falling back to local mock tracks:',
      error
    );
    return MOCK_TRACKS;
  }
}

/**
 * Helper to fetch a single track by its ID.
 */
export async function getTrackById(id: string): Promise<Track | null> {
  const tracks = await getTracks();
  return tracks.find((track) => track.id === id) ?? null;
}
