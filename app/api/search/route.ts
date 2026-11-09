import { NextRequest, NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { MOCK_TRACKS } from "@/lib/mock-tracks";
import { Track } from "@/types/track";
import { searchYouTubeTracks } from "@/lib/youtube";
import { isMusicTrack } from "@/lib/music-filter";

// SWR-compatible upstream query cache headers (5 min server cache, 10 min background revalidation)
const SWR_CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
};

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
  if (videoId) {
    return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  }

  if (!thumbnail || thumbnail.includes("piped-proxy")) {
    return "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80";
  }

  if (thumbnail.includes("=w") || thumbnail.includes("=s")) {
    return thumbnail.replace(/=w\d+-h\d+.*$/, "=w500-h500-l90-rj");
  }

  return thumbnail;
}

async function fetchSearchFromInstance(
  instance: string,
  query: string,
  timeoutMs = 1800
): Promise<Track[]> {
  const searchUrl = `${instance}/search?q=${encodeURIComponent(query)}&filter=music_songs`;
  const res = await fetch(searchUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; BeatSync/1.0)",
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const data = await res.json();
  const items: PipedSearchItem[] = data.items || [];

  const streamItems = items.filter(
    (item) =>
      item.url &&
      !item.isShort &&
      (item.type === "stream" || item.url.includes("watch?v="))
  );

  if (streamItems.length === 0) throw new Error("0 stream items");

  const candidates: Track[] = [];
  for (const item of streamItems) {
    const videoId = extractVideoId(item.url);
    if (!videoId) continue;
    const coverUrl = getHighResCover(item.thumbnail, videoId);
    const durationSecs =
      typeof item.duration === "number" && item.duration > 0
        ? item.duration
        : 0;

    if (
      !isMusicTrack({
        title: item.title,
        duration: durationSecs,
      })
    ) {
      continue;
    }

    candidates.push({
      id: videoId,
      title: item.title || "Unknown Title",
      artist: item.uploaderName || "Unknown Artist",
      album: "YouTube Music",
      duration: durationSecs,
      cover_url: coverUrl,
      audio_url: `/api/stream?id=${encodeURIComponent(videoId)}`,
    });

    if (candidates.length >= 25) break;
  }

  if (candidates.length === 0) throw new Error("0 valid music stream items");
  return candidates;
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
            return NextResponse.json(
              { tracks: data as Track[] },
              { status: 200, headers: SWR_CACHE_HEADERS }
            );
          }
        } catch (dbErr) {
          console.warn("[BeatSync Search] Supabase fallback error:", dbErr);
        }
      }

      return NextResponse.json(
        { tracks: MOCK_TRACKS.slice(0, 20) },
        { status: 200, headers: SWR_CACHE_HEADERS }
      );
    }

    // 2. PRIMARY: Direct Innertube Search via @distube/ytdl-core
    try {
      const primaryResults = await searchYouTubeTracks(query, 25);
      if (primaryResults.length > 0) {
        return NextResponse.json(
          { tracks: primaryResults },
          { status: 200, headers: SWR_CACHE_HEADERS }
        );
      }
    } catch (err) {
      console.warn(`[BeatSync Search] Primary Innertube search failed for "${query}":`, err);
    }

    // 3. SECONDARY: Query Piped API instances in parallel with fast failover
    try {
      const candidates = PIPED_SEARCH_INSTANCES.slice(0, 4);
      const results = await Promise.any(
        candidates.map((inst) => fetchSearchFromInstance(inst, query, 1800))
      );
      if (results && results.length > 0) {
        return NextResponse.json(
          { tracks: results },
          { status: 200, headers: SWR_CACHE_HEADERS }
        );
      }
    } catch {
      // Parallel fetch failed or timed out
    }

    // 4. Fallback: If external APIs failed or returned 0 results, query Supabase or local mock tracks
    console.warn(
      `[BeatSync Search] External APIs unreachable or returned 0 items for "${query}". Falling back to local catalog.`
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
          return NextResponse.json(
            { tracks: data as Track[] },
            { status: 200, headers: SWR_CACHE_HEADERS }
          );
        }
      } catch (dbErr) {
        console.warn("[BeatSync Search] Supabase query error:", dbErr);
      }
    }

    // Lowercase matching against local mock tracks
    const lowerQuery = query.toLowerCase();
    const matchedMocks = MOCK_TRACKS.filter(
      (track) =>
        track.title.toLowerCase().includes(lowerQuery) ||
        track.artist.toLowerCase().includes(lowerQuery) ||
        (track.album && track.album.toLowerCase().includes(lowerQuery))
    );

    return NextResponse.json(
      { tracks: matchedMocks },
      { status: 200, headers: SWR_CACHE_HEADERS }
    );
  } catch (error) {
    console.error("[BeatSync Search API] Unexpected error:", error);
    return NextResponse.json(
      { tracks: MOCK_TRACKS.slice(0, 10), error: "Internal search error" },
      { status: 200, headers: SWR_CACHE_HEADERS }
    );
  }
}
