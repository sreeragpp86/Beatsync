import { NextRequest, NextResponse } from "next/server";
import { MOCK_TRACKS } from "@/lib/mock-tracks";
import { resolveYouTubeAudioStream } from "@/lib/youtube";

// Explicit fallback Piped/Invidious instances as specified, with backup mirrors
const FALLBACK_STREAM_INSTANCES = [
  "https://pipedapi.kavin.rocks",
  "https://api.piped.privacydev.net",
  "https://pipedapi.leptons.xyz",
  "https://pipedapi.ducks.party",
  "https://api.piped.private.coffee",
];

const STREAM_CACHE_HEADERS = {
  "Cache-Control": "public, max-age=1800, stale-while-revalidate=3600",
};

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
  mimeType = "audio/mp4",
  instanceUsed = "direct"
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

  const fallbackHeaders = {
    ...STREAM_CACHE_HEADERS,
    "X-Instance-Used": instanceUsed,
  };

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
      responseHeaders.set(
        "Cache-Control",
        STREAM_CACHE_HEADERS["Cache-Control"]
      );
      responseHeaders.set("X-Instance-Used", instanceUsed);

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

  // Fallback redirect directly to the audio stream URL with required cache headers
  return NextResponse.redirect(targetUrl, {
    status: 307,
    headers: fallbackHeaders,
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id")?.trim();
    const isRetry =
      searchParams.get("retry") === "1" ||
      searchParams.get("refresh") === "true";

    const isAudioTagRequest =
      Boolean(request.headers.get("range")) ||
      request.headers.get("sec-fetch-dest") === "audio";

    const wantsJson =
      searchParams.get("json") === "true" ||
      searchParams.get("direct") === "true" ||
      request.headers.get("accept")?.includes("application/json") ||
      !isAudioTagRequest;

    if (!id) {
      return NextResponse.json(
        { error: "Missing required query parameter: id" },
        { status: 400 }
      );
    }

    let resolved: {
      streamUrl: string;
      duration: number;
      instanceUsed: string;
      format?: string;
      bitrate?: number;
      mimeType?: string;
      isFallback?: boolean;
    } | null = null;

    // 1. Check if ID matches local mock catalog
    const mockTrack = MOCK_TRACKS.find((t) => t.id === id);
    if (mockTrack) {
      resolved = {
        streamUrl: mockTrack.audio_url,
        duration: mockTrack.duration,
        instanceUsed: "local-mock",
        isFallback: false,
      };
    }

    // 2. Multi-instance failover loop across fallback Piped/Invidious instances:
    // 2500ms timeout per instance. If 403, 500, or timeout, seamlessly attempt the next one.
    if (!resolved) {
      for (const instance of FALLBACK_STREAM_INSTANCES) {
        try {
          const result = await fetchStreamFromInstance(instance, id, 2500);
          if (result && result.stream?.url) {
            resolved = {
              streamUrl: result.stream.url,
              duration: result.duration,
              instanceUsed: instance,
              format: result.stream.format || "m4a",
              bitrate: result.stream.bitrate || 128000,
              mimeType: result.stream.mimeType || "audio/mp4",
              isFallback: false,
            };
            console.log(
              `[BeatSync Stream] Successfully resolved stream from fallback instance: ${instance}`
            );
            break;
          }
        } catch (instanceErr: unknown) {
          const errMsg = instanceErr instanceof Error ? instanceErr.message : String(instanceErr);
          console.warn(
            `[BeatSync Stream] Fallback instance ${instance} failed (${errMsg}). Seamlessly attempting next...`
          );
        }
      }
    }

    // 3. Direct YouTube resolution via @distube/ytdl-core if instances failed
    if (!resolved) {
      try {
        const directStream = await resolveYouTubeAudioStream(id, isRetry);
        if (directStream && directStream.url) {
          resolved = {
            streamUrl: directStream.url,
            duration: directStream.duration,
            instanceUsed: "youtube-direct",
            format: "m4a",
            bitrate: directStream.bitrate || 128000,
            mimeType: directStream.mimeType || "audio/mp4",
            isFallback: false,
          };
          console.log(
            `[BeatSync Stream] Successfully resolved stream directly from YouTube for ID: ${id}`
          );
        }
      } catch (err) {
        console.warn(`[BeatSync Stream] Direct YouTube stream resolution failed for ${id}:`, err);
      }
    }

    // 4. Deterministic Mock Fallback: If all upstream resolutions failed
    if (!resolved) {
      const hash = id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
      const fallbackTrack =
        MOCK_TRACKS[Math.abs(hash) % MOCK_TRACKS.length] || MOCK_TRACKS[0];

      console.warn(
        `[BeatSync Stream] All upstream resolutions failed for ${id}. Using deterministic fallback "${fallbackTrack.title}"`
      );

      resolved = {
        streamUrl: fallbackTrack.audio_url,
        duration: fallbackTrack.duration,
        instanceUsed: "fallback-mock",
        isFallback: true,
      };
    }

    // Return { streamUrl: string, duration: number, instanceUsed: string } with Cache-Control headers
    if (wantsJson) {
      return NextResponse.json(
        {
          streamUrl: resolved.streamUrl,
          duration: resolved.duration,
          instanceUsed: resolved.instanceUsed,
          format: resolved.format || "m4a",
          bitrate: resolved.bitrate || 128000,
          isFallback: Boolean(resolved.isFallback),
        },
        {
          status: 200,
          headers: STREAM_CACHE_HEADERS,
        }
      );
    }

    // If an <audio> element streams the bytes directly:
    return await proxyAudioStream(
      request,
      resolved.streamUrl,
      resolved.mimeType || "audio/mp4",
      resolved.instanceUsed
    );
  } catch (error) {
    console.error("[BeatSync Stream API] Unexpected error:", error);
    const fallback = MOCK_TRACKS[0];
    const isAudioTagRequest =
      Boolean(request.headers.get("range")) ||
      request.headers.get("sec-fetch-dest") === "audio";

    if (!isAudioTagRequest) {
      return NextResponse.json(
        {
          streamUrl: fallback.audio_url,
          duration: fallback.duration,
          instanceUsed: "fallback-mock",
          isFallback: true,
        },
        {
          status: 200,
          headers: STREAM_CACHE_HEADERS,
        }
      );
    }

    const fallbackTarget = fallback.audio_url.startsWith("http")
      ? fallback.audio_url
      : new URL(fallback.audio_url, request.url).toString();
    return NextResponse.redirect(fallbackTarget, {
      status: 307,
      headers: {
        ...STREAM_CACHE_HEADERS,
        "X-Instance-Used": "fallback-mock",
      },
    });
  }
}
