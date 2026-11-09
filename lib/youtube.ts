import dns from "node:dns";
import { Ytdl } from "@distube/ytdl-core";
import { Track } from "@/types/track";
import { isMusicTrack } from "@/lib/music-filter";

// Force IPv4 first in Node to avoid IPv6 resolution timeouts
if (typeof dns.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}

// Global singleton instance
const globalForYtdl = globalThis as unknown as {
  ytdlClient?: Ytdl;
  streamCache?: Map<
    string,
    { url: string; mimeType: string; duration: number; expiresAt: number }
  >;
};

export const ytdlClient = globalForYtdl.ytdlClient ?? new Ytdl();
if (process.env.NODE_ENV !== "production") {
  globalForYtdl.ytdlClient = ytdlClient;
}

const streamCache =
  globalForYtdl.streamCache ??
  new Map<
    string,
    { url: string; mimeType: string; duration: number; expiresAt: number }
  >();
if (process.env.NODE_ENV !== "production") {
  globalForYtdl.streamCache = streamCache;
}

export interface ResolvedAudioStream {
  url: string;
  mimeType: string;
  duration: number;
  format?: string;
  bitrate?: number;
}

/**
 * Resolves the direct audio stream for a given YouTube video ID.
 * Caches URLs for 2 hours to provide instant replay and seek support.
 */
export async function resolveYouTubeAudioStream(
  videoId: string,
  skipCache = false
): Promise<ResolvedAudioStream | null> {
  const cleanId = videoId.trim();
  if (!cleanId) return null;

  // 1. Check in-memory stream cache
  if (!skipCache) {
    const cached = streamCache.get(cleanId);
    if (cached && Date.now() < cached.expiresAt) {
      return {
        url: cached.url,
        mimeType: cached.mimeType,
        duration: cached.duration,
      };
    }
  } else {
    streamCache.delete(cleanId);
  }

  // 2. Fetch fresh video stream info using Innertube client
  try {
    const info = await Promise.race([
      ytdlClient.getInfo(cleanId),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("ytdl getInfo timeout")), 7000)
      ),
    ]);

    const formats = info.formats || [];
    const audioFormats = formats.filter((f) => f.hasAudio && Boolean(f.url));

    if (audioFormats.length === 0) {
      return null;
    }

    // Prefer audio-only streams (mp4/m4a or webm/opus) with highest bitrate
    const audioOnly = audioFormats.filter((f) => !f.hasVideo);
    const candidates = audioOnly.length > 0 ? audioOnly : audioFormats;

    candidates.sort((a, b) => {
      const aIsM4a = a.mimeType?.includes("mp4") || a.mimeType?.includes("m4a");
      const bIsM4a = b.mimeType?.includes("mp4") || b.mimeType?.includes("m4a");
      if (aIsM4a && !bIsM4a) return -1;
      if (!aIsM4a && bIsM4a) return 1;
      return (b.bitrate || 0) - (a.bitrate || 0);
    });

    const best = candidates[0];
    if (!best || !best.url) {
      return null;
    }

    const durationSec = best.approxDurationMs
      ? Math.round(best.approxDurationMs / 1000)
      : typeof info.videoDetails?.lengthSeconds === "number"
      ? info.videoDetails.lengthSeconds
      : typeof info.videoDetails?.lengthSeconds === "string"
      ? parseInt(info.videoDetails.lengthSeconds, 10) || 180
      : 180;

    const mimeType = best.mimeType || "audio/mp4";

    // Cache for 2 hours (Google Video expiration is typically 6 hours)
    streamCache.set(cleanId, {
      url: best.url,
      mimeType,
      duration: durationSec,
      expiresAt: Date.now() + 2 * 60 * 60 * 1000,
    });

    return {
      url: best.url,
      mimeType,
      duration: durationSec,
      bitrate: best.bitrate,
    };
  } catch (error) {
    console.warn(`[BeatSync YTDL] Failed to resolve stream for ${cleanId}:`, error);
    return null;
  }
}

/**
 * Searches YouTube for music tracks using Innertube.
 */
export async function searchYouTubeTracks(
  query: string,
  limit = 20
): Promise<Track[]> {
  try {
    const results = await Promise.race([
      ytdlClient.search(query),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("ytdl search timeout")), 4000)
      ),
    ]);

    if (!Array.isArray(results) || results.length === 0) {
      return [];
    }

    const tracks: Track[] = [];
    for (const item of results) {
      if (!item.id) continue;

      const duration =
        typeof item.lengthSeconds === "number" && item.lengthSeconds > 0
          ? item.lengthSeconds
          : 0;

      // Filter out non-music, long-form content (> 10 mins), shorts (< 45s), livestreams
      if (
        !isMusicTrack({
          title: item.title,
          duration,
          isLive: (item as unknown as { isLive?: boolean }).isLive,
          isUpcoming: (item as unknown as { isUpcoming?: boolean }).isUpcoming,
        })
      ) {
        continue;
      }

      tracks.push({
        id: item.id,
        title: item.title || "Unknown Title",
        artist: item.author?.name || "Unknown Artist",
        album: "YouTube Music",
        duration,
        cover_url: `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`,
        audio_url: `/api/stream?id=${encodeURIComponent(item.id)}`,
      });

      if (tracks.length >= limit) break;
    }

    return tracks;
  } catch (error) {
    console.warn(`[BeatSync YTDL] Search failed for "${query}":`, error);
    return [];
  }
}

/**
 * Fetches related tracks for Song Radio / auto-queue.
 * Filters out podcasts, interviews, full albums, loops, and content > 10 minutes.
 */
export async function getRelatedYouTubeTracks(
  videoId: string,
  limit = 15
): Promise<Track[]> {
  try {
    // 1. Prefer YouTube Music radio for authentic single music tracks
    let results: readonly unknown[] = [];
    try {
      results = await Promise.race([
        ytdlClient.getRelated(videoId, { music: true }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("ytdl getRelated music timeout")), 3500)
        ),
      ]);
    } catch {
      // Fallback if YouTube Music radio unavailable for this video
    }

    // 2. Fallback to standard related videos if YouTube Music radio returned empty
    if (!Array.isArray(results) || results.length === 0) {
      results = await Promise.race([
        ytdlClient.getRelated(videoId),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("ytdl getRelated timeout")), 4000)
        ),
      ]);
    }

    if (!Array.isArray(results) || results.length === 0) {
      return [];
    }

    const tracks: Track[] = [];
    for (const rawItem of results) {
      const item = rawItem as {
        id?: string;
        title?: string;
        author?: { name?: string };
        lengthSeconds?: number;
        isLive?: boolean;
        isUpcoming?: boolean;
      };

      if (!item.id || item.id === videoId) continue;

      const duration =
        typeof item.lengthSeconds === "number" && item.lengthSeconds > 0
          ? item.lengthSeconds
          : 0;

      // Filter out non-music, long-form content (> 10 mins), shorts (< 45s), livestreams
      if (
        !isMusicTrack({
          title: item.title,
          duration,
          isLive: item.isLive,
          isUpcoming: item.isUpcoming,
        })
      ) {
        continue;
      }

      tracks.push({
        id: item.id,
        title: item.title || "Unknown Title",
        artist: item.author?.name || "Related Artist",
        album: "Song Radio",
        duration,
        cover_url: `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`,
        audio_url: `/api/stream?id=${encodeURIComponent(item.id)}`,
      });

      if (tracks.length >= limit) break;
    }

    return tracks;
  } catch (error) {
    console.warn(`[BeatSync YTDL] getRelated failed for ${videoId}:`, error);
    return [];
  }
}
