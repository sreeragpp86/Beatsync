import { NextRequest, NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { MOCK_TRACKS } from "@/lib/mock-tracks";
import { Track } from "@/types/track";

// Reliable public Piped API instances ordered by current availability
const PIPED_SEARCH_INSTANCES = [
  "https://pipedapi.ducks.party",
  "https://api.piped.private.coffee",
  "https://pipedapi.kavin.rocks",
  "https://api.piped.privacydev.net",
  "https://pipedapi.tokhmi.xyz",
  "https://pipedapi.leptons.xyz",
  "https://pipedapi.drgns.space",
  "https://pipedapi.adminforge.de",
  "https://piped-api.garudalinux.org",
];

interface PipedSearchItem {
  url?: string;
  type?: string;
  title?: string;
  thumbnail?: string;
  uploaderName?: string;
  duration?: number;
  isShort?: boolean;
}

function extractVideoId(url?: string): string {
  if (!url) return "";
  const match = url.match(/[?&]v=([^&]+)/);
  if (match) return match[1];
  if (url.startsWith("/watch?v=")) return url.slice(9);
  return url.replace(/^\//, "");
}

function getHighResCover(thumbnail?: string, videoId?: string): string {
  if (!thumbnail) {
    return videoId
      ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
      : "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80";
  }

  // If thumbnail has standard Google / Piped size params (=w120-h120, =s120, etc.), upgrade to 500x500
  if (thumbnail.includes("=w") || thumbnail.includes("=s")) {
    return thumbnail.replace(/=w\d+-h\d+.*$/, "=w500-h500-l90-rj");
  }

  return thumbnail;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawQuery = searchParams.get("q")?.trim() || "";
    const query = rawQuery.replace(/[,()]/g, " ").trim();

    // 1. If query is empty, return featured catalog (Supabase tracks or mock tracks)
    if (!query) {
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase
            .from("tracks")
            .select("id, title, artist, album, duration, cover_url, audio_url")
            .order("id", { ascending: true })
            .limit(20);

          if (!error && data && data.length > 0) {
            return NextResponse.json({ tracks: data as Track[] }, { status: 200 });
          }
        } catch (dbErr) {
          console.warn("[BeatSync Search] Supabase fallback error:", dbErr);
        }
      }

      return NextResponse.json(
        { tracks: MOCK_TRACKS.slice(0, 20) },
        { status: 200 }
      );
    }

    // 2. Query is present: Fetch from Piped API instances (filter=music_songs)
    let externalTracks: Track[] = [];

    for (const instance of PIPED_SEARCH_INSTANCES) {
      try {
        const searchUrl = `${instance}/search?q=${encodeURIComponent(query)}&filter=music_songs`;
        const res = await fetch(searchUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; BeatSync/1.0)",
            Accept: "application/json",
          },
          signal: AbortSignal.timeout(3000), // 3-second failover timeout
        });

        if (!res.ok) continue;

        const data = await res.json();
        const items: PipedSearchItem[] = data.items || [];

        const streamItems = items.filter(
          (item) =>
            item.url &&
            !item.isShort &&
            (item.type === "stream" || item.url.includes("watch?v="))
        );

        if (streamItems.length > 0) {
          externalTracks = streamItems.slice(0, 25).map((item) => {
            const videoId = extractVideoId(item.url);
            const coverUrl = getHighResCover(item.thumbnail, videoId);
            const durationSecs =
              typeof item.duration === "number" && item.duration > 0
                ? item.duration
                : 0;

            return {
              id: videoId,
              title: item.title || "Unknown Title",
              artist: item.uploaderName || "Unknown Artist",
              album: "YouTube Music",
              duration: durationSecs,
              cover_url: coverUrl,
              audio_url: `/api/stream?id=${encodeURIComponent(videoId)}`,
            };
          });

          // Successfully obtained results from Piped
          break;
        }
      } catch {
        // Try next Piped instance silently
        continue;
      }
    }

    if (externalTracks.length > 0) {
      return NextResponse.json({ tracks: externalTracks }, { status: 200 });
    }

    // 3. Fallback: If external APIs failed or returned 0 results, query Supabase or local mock tracks
    console.warn(
      `[BeatSync Search] External Piped APIs unreachable or returned 0 items for "${query}". Falling back to local catalog.`
    );

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from("tracks")
          .select("id, title, artist, album, duration, cover_url, audio_url")
          .or(`title.ilike.%${query}%,artist.ilike.%${query}%,album.ilike.%${query}%`)
          .order("id", { ascending: true })
          .limit(20);

        if (!error && data && data.length > 0) {
          return NextResponse.json({ tracks: data as Track[] }, { status: 200 });
        }
      } catch (dbErr) {
        console.warn("[BeatSync Search] Supabase fallback failed:", dbErr);
      }
    }

    const qLower = query.toLowerCase();
    const mockMatches = MOCK_TRACKS.filter(
      (track) =>
        track.title.toLowerCase().includes(qLower) ||
        track.artist.toLowerCase().includes(qLower) ||
        (track.album && track.album.toLowerCase().includes(qLower))
    );

    return NextResponse.json(
      { tracks: mockMatches.slice(0, 20) },
      { status: 200 }
    );
  } catch (error) {
    console.error("[BeatSync Search API] Unexpected server error:", error);
    return NextResponse.json(
      { tracks: MOCK_TRACKS.slice(0, 20) },
      { status: 200 }
    );
  }
}
