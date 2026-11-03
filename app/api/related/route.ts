import { NextRequest, NextResponse } from "next/server";
import { MOCK_TRACKS } from "@/lib/mock-tracks";
import { Track } from "@/types/track";

// Reliable public Piped instances for related streams resolution
const PIPED_RELATED_INSTANCES = [
  "https://pipedapi.ducks.party",
  "https://api.piped.private.coffee",
  "https://pipedapi.kavin.rocks",
  "https://api.piped.privacydev.net",
  "https://pipedapi.tokhmi.xyz",
  "https://pipedapi.leptons.xyz",
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
  if (!thumbnail) {
    return videoId
      ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
      : "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80";
  }

  if (thumbnail.includes("=w") || thumbnail.includes("=s")) {
    return thumbnail.replace(/=w\d+-h\d+.*$/, "=w500-h500-l90-rj");
  }

  return thumbnail;
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

    // 1. If it's a local mock track, return other mock tracks
    const isMock = MOCK_TRACKS.some((t) => t.id === id);
    if (isMock) {
      const candidates = MOCK_TRACKS.filter((t) => t.id !== id);
      return NextResponse.json({ tracks: candidates.slice(0, 12) }, { status: 200 });
    }

    // 2. Fetch related streams from Piped /streams/${id} endpoint
    let relatedTracks: Track[] = [];

    for (const instance of PIPED_RELATED_INSTANCES) {
      try {
        const streamEndpoint = `${instance}/streams/${encodeURIComponent(id)}`;
        const res = await fetch(streamEndpoint, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Accept: "application/json",
          },
          signal: AbortSignal.timeout(3500),
        });

        if (!res.ok) continue;

        const data = await res.json();
        const relatedItems: PipedRelatedItem[] = data.relatedStreams || [];

        const streamItems = relatedItems.filter(
          (item) =>
            item.url &&
            !item.isShort &&
            (item.type === "stream" || item.url.includes("watch?v="))
        );

        if (streamItems.length > 0) {
          const mapped: Track[] = [];
          for (const item of streamItems) {
            const videoId = extractVideoId(item.url);
            if (!videoId || videoId === id) continue;

            mapped.push({
              id: videoId,
              title: item.title || "Unknown Title",
              artist: item.uploaderName || "Unknown Artist",
              album: "Song Radio",
              duration:
                typeof item.duration === "number" && item.duration > 0
                  ? item.duration
                  : 0,
              cover_url: getHighResCover(item.thumbnail, videoId),
              audio_url: `/api/stream?id=${encodeURIComponent(videoId)}`,
            });
          }

          if (mapped.length > 0) {
            relatedTracks = mapped;
            if (relatedTracks.length >= 3) {
              break;
            }
          }
        }
      } catch {
        continue;
      }
    }

    // 3. Fallback: If /streams failed or returned 0 related tracks, query search by artist
    if (relatedTracks.length === 0 && (artist || title)) {
      const query = artist || title || "popular music";
      for (const instance of PIPED_RELATED_INSTANCES) {
        try {
          const searchUrl = `${instance}/search?q=${encodeURIComponent(
            query
          )}&filter=music_songs`;

          const res = await fetch(searchUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (compatible; BeatSync/1.0)",
              Accept: "application/json",
            },
            signal: AbortSignal.timeout(3000),
          });

          if (!res.ok) continue;

          const data = await res.json();
          const items: PipedRelatedItem[] = data.items || [];

          const streamItems = items.filter(
            (item) =>
              item.url &&
              !item.isShort &&
              (item.type === "stream" || item.url.includes("watch?v="))
          );

          if (streamItems.length > 0) {
            const mappedFallback: Track[] = [];
            for (const item of streamItems) {
              const videoId = extractVideoId(item.url);
              if (!videoId || videoId === id) continue;

              mappedFallback.push({
                id: videoId,
                title: item.title || "Unknown Title",
                artist: item.uploaderName || "Unknown Artist",
                album: "Song Radio",
                duration:
                  typeof item.duration === "number" && item.duration > 0
                    ? item.duration
                    : 0,
                cover_url: getHighResCover(item.thumbnail, videoId),
                audio_url: `/api/stream?id=${encodeURIComponent(videoId)}`,
              });
            }

            if (mappedFallback.length > 0) {
              relatedTracks = mappedFallback;
              break;
            }
          }
        } catch {
          continue;
        }
      }
    }

    if (relatedTracks.length > 0) {
      return NextResponse.json(
        { tracks: relatedTracks.slice(0, 15) },
        { status: 200 }
      );
    }

    // 4. Final offline fallback: return mock catalog tracks excluding current track
    const fallbackMocks = MOCK_TRACKS.filter((t) => t.id !== id);
    return NextResponse.json(
      { tracks: fallbackMocks.slice(0, 12) },
      { status: 200 }
    );
  } catch (error) {
    console.error("[BeatSync Related API] Unexpected error:", error);
    const fallbackMocks = MOCK_TRACKS.slice(0, 10);
    return NextResponse.json({ tracks: fallbackMocks }, { status: 200 });
  }
}
