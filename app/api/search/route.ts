import { NextRequest, NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { MOCK_TRACKS } from "@/lib/mock-tracks";
import { Track } from "@/types/track";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawQuery = searchParams.get("q")?.trim() || "";
    // Sanitize query to prevent PostgREST syntax injection with commas or parens
    const query = rawQuery.replace(/[,()]/g, " ").trim();

    // 1. If Supabase is connected, query the tracks table
    if (isSupabaseConfigured) {
      try {
        let dbQuery = supabase
          .from("tracks")
          .select("id, title, artist, album, duration, cover_url, audio_url");

        if (query) {
          // Case-insensitive wildcard match across title, artist, and album
          dbQuery = dbQuery.or(
            `title.ilike.%${query}%,artist.ilike.%${query}%,album.ilike.%${query}%`
          );
        }

        const { data, error } = await dbQuery
          .order("id", { ascending: true })
          .limit(20);

        if (!error && data) {
          return NextResponse.json(
            { tracks: data as Track[] },
            { status: 200 }
          );
        }

        if (error) {
          console.warn(
            `[SoundWave Search API] Supabase query error: ${error.message}. Falling back to mock tracks.`
          );
        }
      } catch (dbErr) {
        console.warn(
          "[SoundWave Search API] Supabase connection exception. Falling back to mock tracks:",
          dbErr
        );
      }
    }

    // 2. Fallback: filter local mock tracks
    let results: Track[] = MOCK_TRACKS;

    if (query) {
      const qLower = query.toLowerCase();
      results = MOCK_TRACKS.filter(
        (track) =>
          track.title.toLowerCase().includes(qLower) ||
          track.artist.toLowerCase().includes(qLower) ||
          (track.album && track.album.toLowerCase().includes(qLower))
      );
    }

    return NextResponse.json(
      { tracks: results.slice(0, 20) },
      { status: 200 }
    );
  } catch (error) {
    console.error("[SoundWave Search API] Unexpected server error:", error);
    return NextResponse.json(
      { tracks: MOCK_TRACKS.slice(0, 20) },
      { status: 200 }
    );
  }
}
