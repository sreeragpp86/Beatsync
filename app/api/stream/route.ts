import { NextRequest, NextResponse } from "next/server";
import { MOCK_TRACKS } from "@/lib/mock-tracks";
import { resolveYouTubeAudioStream } from "@/lib/youtube";

// Explicit 3 fallback Piped/Invidious instances as specified
const FALLBACK_STREAM_INSTANCES = [
  "https://pipedapi.kavin.rocks",
  "https://api.piped.privacydev.net",
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

function selectBestAudioStream(
  data: PipedStreamResponse
): PipedAudioStream | null {
  const audioStreams = Array.isArray(data.audioStreams) ? data.audioStreams : [];

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

/**
 * Fetches stream details from a single instance with a strict 2500ms timeout.
 * Throws on timeout, 403, 500, or invalid responses to trigger cycling.
 */
async function fetchStreamFromInstance(
  instance: string,
  id: string,
  timeoutMs = 2500
): Promise<{ stream: PipedAudioStream; duration: number }> {
  const streamEndpoint = `${instance}/streams/${encodeURIComponent(id)}`;
  const res = await fetch(streamEndpoint, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!res.ok) {
    throw new Error(`Instance returned HTTP ${res.status}`);
  }

  const data: PipedStreamResponse = await res.json();
  if (data.error || data.message) {
    throw new Error(data.error || data.message || "Piped error response");
  }

  const bestStream = selectBestAudioStream(data);
  if (!bestStream || !bestStream.url) {
    throw new Error("No playable audio stream in response");
  }

  return {
    stream: bestStream,
    duration: typeof data.duration === "number" ? data.duration : 0,
  };
}

/**
 * Pipes audio through a Next.js streaming ReadableStream with full HTTP range
 * and permissive CORS headers, avoiding client-side CORS issues.
 */
async function proxyAudioStream(
  request: NextRequest,
  targetUrl: string,
  mimeType = "audio/mp4"
): Promise<Response> {
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
    const audioResponse = await fetch(targetUrl, {
      headers: upstreamHeaders,
      signal: AbortSignal.timeout(12000),
    });

    if (audioResponse.ok || audioResponse.status === 206) {
      const responseHeaders = new Headers();
      responseHeaders.set(
        "Content-Type",
        audioResponse.headers.get("content-type") || mimeType || "audio/mp4"
      );
      responseHeaders.set("Accept-Ranges", "bytes");
      responseHeaders.set("Access-Control-Allow-Origin", "*");
      responseHeaders.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
      responseHeaders.set(
        "Access-Control-Allow-Headers",
        "Range, Content-Type, Accept"
      );
      responseHeaders.set(
        "Access-Control-Expose-Headers",
        "Content-Range, Content-Length, Accept-Ranges"
      );
      responseHeaders.set("Cache-Control", "public, max-age=3600");

      const contentLength = audioResponse.headers.get("content-length");
      if (contentLength) {
        responseHeaders.set("Content-Length", contentLength);
      }
      const contentRange = audioResponse.headers.get("content-range");
      if (contentRange) {
        responseHeaders.set("Content-Range", contentRange);
      }

      // Pipe audio stream through a Next.js streaming ReadableStream
      return new Response(audioResponse.body, {
        status: audioResponse.status,
        headers: responseHeaders,
      });
    }
  } catch (pipeErr) {
    console.warn("[BeatSync Stream] Direct pipe error, redirecting:", pipeErr);
  }

  // Fallback redirect directly to the audio stream URL
  return NextResponse.redirect(targetUrl, 307);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id")?.trim();
    const wantsJson =
      searchParams.get("json") === "true" ||
      searchParams.get("direct") === "true" ||
      request.headers.get("accept")?.includes("application/json");
    const isRetry =
      searchParams.get("retry") === "1" ||
      searchParams.get("refresh") === "true";

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
          isFallback: false,
        });
      }
      const targetUrl = mockTrack.audio_url.startsWith("http")
        ? mockTrack.audio_url
        : new URL(mockTrack.audio_url, request.url).toString();
      return NextResponse.redirect(targetUrl, 307);
    }

    // 2. PRIMARY: Direct Innertube stream resolution via @distube/ytdl-core
    try {
      // If retry is requested, skip in-memory cache to obtain fresh stream tokens
      const directStream = await resolveYouTubeAudioStream(id, isRetry);
      if (directStream && directStream.url) {
        if (wantsJson) {
          return NextResponse.json(
            {
              streamUrl: directStream.url,
              duration: directStream.duration,
              format: "m4a",
              bitrate: directStream.bitrate || 128000,
              mimeType: directStream.mimeType || "audio/mp4",
              isFallback: false,
            },
            { status: 200 }
          );
        }

        return await proxyAudioStream(
          request,
          directStream.url,
          directStream.mimeType
        );
      }
    } catch (err) {
      console.warn(`[BeatSync Stream] Primary resolution failed for ${id}:`, err);
    }

    // 3. FALLBACK: Sequentially cycle through the 3 fallback Piped/Invidious instances
    // If an instance times out (>2500ms) or returns 403/500, cycle automatically to the next
    let fallbackResult: { stream: PipedAudioStream; duration: number } | null =
      null;

    for (const instance of FALLBACK_STREAM_INSTANCES) {
      try {
        const result = await fetchStreamFromInstance(instance, id, 2500);
        if (result && result.stream?.url) {
          fallbackResult = result;
          console.log(
            `[BeatSync Stream] Successfully resolved stream from fallback: ${instance}`
          );
          break;
        }
      } catch (instanceErr: any) {
        console.warn(
          `[BeatSync Stream] Fallback instance ${instance} failed (${instanceErr?.message || "error"}). Cycling to next...`
        );
      }
    }

    if (fallbackResult && fallbackResult.stream?.url) {
      const { stream, duration } = fallbackResult;

      if (wantsJson) {
        return NextResponse.json(
          {
            streamUrl: stream.url,
            duration,
            format: stream.format || "m4a",
            bitrate: stream.bitrate || 0,
            mimeType: stream.mimeType || "audio/mp4",
            isFallback: false,
          },
          { status: 200 }
        );
      }

      return await proxyAudioStream(
        request,
        stream.url,
        stream.mimeType || "audio/mp4"
      );
    }

    // 4. Deterministic Mock Fallback: If all upstream resolutions failed
    const hash = id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const fallbackTrack =
      MOCK_TRACKS[Math.abs(hash) % MOCK_TRACKS.length] || MOCK_TRACKS[0];

    console.warn(
      `[BeatSync Stream] All upstream resolutions failed for ${id}. Using fallback "${fallbackTrack.title}"`
    );

    if (wantsJson) {
      return NextResponse.json(
        {
          streamUrl: fallbackTrack.audio_url,
          duration: fallbackTrack.duration,
          title: fallbackTrack.title,
          artist: fallbackTrack.artist,
          isFallback: true,
          originalId: id,
        },
        {
          status: 200,
          headers: {
            "Cache-Control": "public, max-age=60",
          },
        }
      );
    }

    const fallbackTarget = fallbackTrack.audio_url.startsWith("http")
      ? fallbackTrack.audio_url
      : new URL(fallbackTrack.audio_url, request.url).toString();
    return NextResponse.redirect(fallbackTarget, 307);
  } catch (error) {
    console.error("[BeatSync Stream API] Unexpected error:", error);
    const fallback = MOCK_TRACKS[0];
    const fallbackTarget = fallback.audio_url.startsWith("http")
      ? fallback.audio_url
      : new URL(fallback.audio_url, request.url).toString();
    return NextResponse.redirect(fallbackTarget, 307);
  }
}
