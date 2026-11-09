import { NextRequest, NextResponse } from "next/server";
import { MOCK_TRACKS } from "@/lib/mock-tracks";
import { Track } from "@/types/track";
import { getRelatedYouTubeTracks } from "@/lib/youtube";
import { isMusicTrack } from "@/lib/music-filter";

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

    const duration =
      typeof item.duration === "number" && item.duration > 0
        ? item.duration
        : 0;

    // Filter out long-form videos (> 10 mins), shorts (< 45s), and non-music content
    if (
      !isMusicTrack({
        title: item.title,
        duration,
      })
    ) {
      continue;
    }

    mapped.push({
      id: videoId,
      title: item.title || "Unknown Title",
      artist: item.uploaderName || "Unknown Artist",
      album: "Song Radio",
      duration,
      cover_url: getHighResCover(item.thumbnail, videoId),
      audio_url: `/api/stream?id=${encodeURIComponent(videoId)}`,
    });
  }

  if (mapped.length === 0) throw new Error("No related tracks found");
  return mapped.slice(0, 15);
}

function applyVibeFilter(tracks: Track[], vibe: string): Track[] {
  if (!tracks || tracks.length === 0) return [];

  // Guarantee all output tracks strictly comply with music track constraints
  const musicOnlyTracks = tracks.filter((t) => isMusicTrack(t));
  if (musicOnlyTracks.length === 0) return [];

  if (vibe === "deep-cuts") {
    // Deep cuts: prioritize secondary/less obvious recommendation nodes
    if (musicOnlyTracks.length > 4) {
      const secondary = musicOnlyTracks.slice(3);
      const primary = musicOnlyTracks.slice(0, 3);
      return [...secondary, ...primary];
    }
    return [...musicOnlyTracks].reverse();
  }

  if (vibe === "upbeat") {
    // High energy: prioritize energetic titles, remixes, or punchy radio durations (2:30 - 4:00)
    return [...musicOnlyTracks].sort((a, b) => {
      const aUpbeat = /remix|dance|mix|club|edit|live|fast|beat|upbeat|party|energy/i.test(a.title);
      const bUpbeat = /remix|dance|mix|club|edit|live|fast|beat|upbeat|party|energy/i.test(b.title);
      if (aUpbeat && !bUpbeat) return -1;
      if (!aUpbeat && bUpbeat) return 1;
      const aDiff = Math.abs(a.duration - 200);
      const bDiff = Math.abs(b.duration - 200);
      return aDiff - bDiff;
    });
  }

  // "balanced" and "familiar" keep the top algorithmic associations
  return musicOnlyTracks;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id")?.trim();
    const artist = searchParams.get("artist")?.trim();
    const title = searchParams.get("title")?.trim();
    const vibe = searchParams.get("vibe")?.trim() || "balanced";

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
      const filtered = applyVibeFilter(candidates, vibe);
      return NextResponse.json({ tracks: filtered.slice(0, 15) }, { status: 200 });
    }

    // 2. PRIMARY: Fetch real related YouTube tracks via Innertube
    try {
      const relatedTracks = await getRelatedYouTubeTracks(id, 15);
      if (relatedTracks.length > 0) {
        const filtered = applyVibeFilter(relatedTracks, vibe);
        return NextResponse.json({ tracks: filtered }, { status: 200 });
      }
    } catch (err) {
      console.warn(`[BeatSync Related API] Primary resolution failed for ${id}:`, err);
    }

    // 3. SECONDARY: Query Piped search instances in parallel
    let searchQuery = artist || title || "popular music";
    if (vibe === "upbeat") {
      searchQuery = `${searchQuery} dance upbeat`;
    } else if (vibe === "deep-cuts") {
      searchQuery = `${searchQuery} album cut audio`;
    }

    try {
      const results = await Promise.any(
        PIPED_RELATED_INSTANCES.map((instance) =>
          fetchRelatedFromInstance(instance, searchQuery, id, 1500)
        )
      );
      if (results && results.length > 0) {
        const filtered = applyVibeFilter(results, vibe);
        return NextResponse.json({ tracks: filtered }, { status: 200 });
      }
    } catch {
      // Parallel fetch failed or timed out
    }

    // 4. Fallback: Return diverse tracks from local catalog
    const localCandidates = MOCK_TRACKS.filter((t) => t.id !== id);
    const filtered = applyVibeFilter(localCandidates, vibe);
    return NextResponse.json(
      { tracks: filtered.slice(0, 15) },
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
