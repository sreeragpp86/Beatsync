import { NextRequest, NextResponse } from "next/server";
import { MOCK_TRACKS } from "@/lib/mock-tracks";
import { Track } from "@/types/track";
import { getRelatedYouTubeTracks } from "@/lib/youtube";

// Reliable public Piped instances for related streams resolution fallback
const PIPED_RELATED_INSTANCES = [
  "https://pipedapi.ducks.party",
  "https://api.piped.private.coffee",
  "https://pipedapi.kavin.rocks",
  "https://api.piped.privacydev.net",
];

interface PipedRelatedItem {
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

async function fetchRelatedFromInstance(
  instance: string,
  query: string,
  currentId: string,
  timeoutMs = 1500
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
  const items: PipedRelatedItem[] = data.items || [];
  const streamItems = items.filter(
    (item) =>
      item.url &&
      !item.isShort &&
      (item.type === "stream" || item.url.includes("watch?v="))
  );

  const mapped: Track[] = [];
  for (const item of streamItems) {
    const videoId = extractVideoId(item.url);
    if (!videoId || videoId === currentId) continue;

    mapped.push({
      id: videoId,
      title: item.title || "Unknown Title",
      artist: item.uploaderName || "Unknown Artist",
      album: "Song Radio",
      duration:
        typeof item.duration === "number" && item.duration > 0
          ? item.duration
          : 180,
      cover_url: getHighResCover(item.thumbnail, videoId),
      audio_url: `/api/stream?id=${encodeURIComponent(videoId)}`,
    });
  }

  if (mapped.length === 0) throw new Error("No related tracks found");
  return mapped.slice(0, 15);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id")?.trim();
    const artist = searchParams.get("artist")?.trim();
    const title = searchParams.get("title")?.trim();

    if (!id) {
      return NextResponse.json(
        { error: "Missing required query parameter: id" },
        { status: 400 }
      );
    }

    // 1. If it's a local mock track, return other mock tracks immediately
    const isMock = MOCK_TRACKS.some((t) => t.id === id);
    if (isMock) {
      const candidates = MOCK_TRACKS.filter((t) => t.id !== id);
      return NextResponse.json({ tracks: candidates.slice(0, 15) }, { status: 200 });
    }

    // 2. PRIMARY: Fetch real related YouTube tracks via Innertube
    try {
      const relatedTracks = await getRelatedYouTubeTracks(id, 15);
      if (relatedTracks.length > 0) {
        return NextResponse.json({ tracks: relatedTracks }, { status: 200 });
      }
    } catch (err) {
      console.warn(`[BeatSync Related API] Primary resolution failed for ${id}:`, err);
    }

    // 3. SECONDARY: Query Piped search instances in parallel
    const searchQuery = artist || title || "popular music";
    try {
      const results = await Promise.any(
        PIPED_RELATED_INSTANCES.map((instance) =>
          fetchRelatedFromInstance(instance, searchQuery, id, 1500)
        )
      );
      if (results && results.length > 0) {
        return NextResponse.json({ tracks: results }, { status: 200 });
      }
    } catch {
      // Parallel fetch failed or timed out
    }

    // 4. Fallback: Return diverse tracks from local catalog
    const localCandidates = MOCK_TRACKS.filter((t) => t.id !== id);
    return NextResponse.json(
      { tracks: localCandidates.slice(0, 15) },
      { status: 200 }
    );
  } catch (error) {
    console.error("[BeatSync Related API] Unexpected error:", error);
    return NextResponse.json(
      { tracks: MOCK_TRACKS.slice(0, 15) },
      { status: 200 }
    );
  }
}
