import { NextRequest, NextResponse } from "next/server";
import { MOCK_TRACKS } from "@/lib/mock-tracks";

// Reliable public Piped instances for stream resolving
const PIPED_STREAM_INSTANCES = [
  "https://pipedapi.ducks.party",
  "https://api.piped.private.coffee",
  "https://pipedapi.kavin.rocks",
  "https://api.piped.privacydev.net",
  "https://pipedapi.tokhmi.xyz",
  "https://pipedapi.leptons.xyz",
];

interface PipedAudioStream {
  url: string;
  format?: string;
  quality?: string;
  mimeType?: string;
  codec?: string;
  videoOnly?: boolean;
  bitrate?: number;
  contentLength?: number;
}

interface PipedStreamResponse {
  title?: string;
  duration?: number;
  audioStreams?: PipedAudioStream[];
  videoStreams?: Array<{
    url: string;
    format?: string;
    videoOnly?: boolean;
    mimeType?: string;
    bitrate?: number;
  }>;
  error?: string;
  message?: string;
}

function selectBestAudioStream(data: PipedStreamResponse): PipedAudioStream | null {
  const audioStreams = Array.isArray(data.audioStreams) ? data.audioStreams : [];

  // 1. Try to find audio-only stream (m4a or opus preferred with highest bitrate)
  const validAudio = audioStreams.filter((s) => Boolean(s?.url));
  if (validAudio.length > 0) {
    validAudio.sort((a, b) => {
      const aFormat = (a.format || "").toLowerCase();
      const bFormat = (b.format || "").toLowerCase();
      const aIsPreferred = aFormat === "m4a" || aFormat === "opus";
      const bIsPreferred = bFormat === "m4a" || bFormat === "opus";

      if (aIsPreferred && !bIsPreferred) return -1;
      if (!aIsPreferred && bIsPreferred) return 1;
      return (b.bitrate || 0) - (a.bitrate || 0);
    });

    return validAudio[0];
  }

  // 2. Fallback: check videoStreams with audio track (videoOnly === false)
  const videoStreams = Array.isArray(data.videoStreams) ? data.videoStreams : [];
  const withAudio = videoStreams.filter(
    (v) => v.videoOnly === false && Boolean(v.url)
  );

  if (withAudio.length > 0) {
    return {
      url: withAudio[0].url,
      format: withAudio[0].format || "mp4",
      mimeType: withAudio[0].mimeType || "audio/mp4",
      bitrate: withAudio[0].bitrate || 128000,
    };
  }

  return null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id")?.trim();
    const wantsJson =
      searchParams.get("json") === "true" ||
      request.headers.get("accept")?.includes("application/json");

    if (!id) {
      return NextResponse.json(
        { error: "Missing required query parameter: id" },
        { status: 400 }
      );
    }

    // 1. Check if ID matches local mock catalog
    const mockTrack = MOCK_TRACKS.find((t) => t.id === id);
    if (mockTrack) {
      if (wantsJson) {
        return NextResponse.json({
          streamUrl: mockTrack.audio_url,
          duration: mockTrack.duration,
          title: mockTrack.title,
          artist: mockTrack.artist,
        });
      }
      return NextResponse.redirect(mockTrack.audio_url, 307);
    }

    // 2. Query Piped stream endpoint across candidate instances
    let resolvedStream: PipedAudioStream | null = null;
    let streamDuration = 0;

    for (const instance of PIPED_STREAM_INSTANCES) {
      try {
        const streamEndpoint = `${instance}/streams/${encodeURIComponent(id)}`;
        const res = await fetch(streamEndpoint, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Accept: "application/json",
          },
          signal: AbortSignal.timeout(2500), // 2.5-second failover timeout per instance
        });

        if (!res.ok) continue;

        const data: PipedStreamResponse = await res.json();
        if (data.error || data.message) continue;

        const bestStream = selectBestAudioStream(data);
        if (bestStream && bestStream.url) {
          resolvedStream = bestStream;
          streamDuration = typeof data.duration === "number" ? data.duration : 0;
          break;
        }
      } catch {
        // Failover to next instance
        continue;
      }
    }

    // 3. If stream resolved successfully
    if (resolvedStream && resolvedStream.url) {
      // If client explicitly requested JSON metadata
      if (wantsJson) {
        return NextResponse.json(
          {
            streamUrl: resolvedStream.url,
            duration: streamDuration,
            format: resolvedStream.format || "m4a",
            bitrate: resolvedStream.bitrate || 0,
            mimeType: resolvedStream.mimeType || "audio/mp4",
          },
          { status: 200 }
        );
      }

      // Default: Audio playback stream proxy with HTTP Range support
      const clientRange = request.headers.get("range");
      const upstreamHeaders: Record<string, string> = {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "*/*",
      };

      if (clientRange) {
        upstreamHeaders["Range"] = clientRange;
      }

      try {
        const audioResponse = await fetch(resolvedStream.url, {
          headers: upstreamHeaders,
          signal: AbortSignal.timeout(8000),
        });

        if (audioResponse.ok || audioResponse.status === 206) {
          const responseHeaders = new Headers();
          responseHeaders.set(
            "Content-Type",
            audioResponse.headers.get("content-type") ||
              resolvedStream.mimeType ||
              "audio/mp4"
          );
          responseHeaders.set("Accept-Ranges", "bytes");
          responseHeaders.set("Access-Control-Allow-Origin", "*");
          responseHeaders.set("Cache-Control", "public, max-age=3600");

          const contentLength = audioResponse.headers.get("content-length");
          if (contentLength) {
            responseHeaders.set("Content-Length", contentLength);
          }
          const contentRange = audioResponse.headers.get("content-range");
          if (contentRange) {
            responseHeaders.set("Content-Range", contentRange);
          }

          return new Response(audioResponse.body, {
            status: audioResponse.status,
            headers: responseHeaders,
          });
        }
      } catch (pipeErr) {
        console.warn(
          "[BeatSync Stream] Direct pipe error, falling back to 307 redirect:",
          pipeErr
        );
      }

      // Fallback redirect directly to the audio stream URL
      return NextResponse.redirect(resolvedStream.url, 307);
    }

    // 4. Stream resolution failed across all instances
    console.warn(
      `[BeatSync Stream] Unable to resolve audio stream for track ID: ${id}`
    );

    // If client requested JSON, return 502 with detailed error
    if (wantsJson) {
      return NextResponse.json(
        {
          error: "Unable to resolve audio stream from Piped API instances",
          trackId: id,
        },
        { status: 502 }
      );
    }

    // For browser audio element, redirect to fallback track or return 502
    return NextResponse.json(
      {
        error: "Audio stream unavailable",
        trackId: id,
      },
      { status: 502 }
    );
  } catch (error) {
    console.error("[BeatSync Stream API] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
