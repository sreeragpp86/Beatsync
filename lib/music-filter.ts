/**
 * BeatSync Music Filter Engine
 * Ensures audio queues, recommendations, and search results contain only
 * authentic individual music tracks, eliminating long-form videos (full albums,
 * podcasts, interviews, DJ sets, 1-hour loops, documentaries) and micro-clips.
 */

export const MIN_TRACK_DURATION = 45; // 45 seconds (filters shorts, sound bites, intro tags)
export const MAX_TRACK_DURATION = 600; // 10 minutes (600 seconds) - maximum allowed music track limit

/**
 * Regex for filtering out non-single-track titles such as full albums, podcasts,
 * interviews, reactions, reviews, multi-hour loops, documentaries, etc.
 */
export const NON_MUSIC_TITLE_REGEX =
  /\b(full\s+album|complete\s+album|discography|podcast|episode\s*\d+|interview|reaction|review|breakdown|analysis|explained|documentary|behind\s+the\s+scenes|making\s+of|vlog|audiobook|lecture|tutorial|stream\s+archive|\d+\s*hours?|\d+\s*hrs?|hour\s+loop|extended\s+loop|full\s+concert|full\s+show|full\s+performance|full\s+set|dj\s+set|live\s+set)\b/i;

export interface MusicTrackCandidate {
  title?: string;
  duration?: number;
  isLive?: boolean;
  isUpcoming?: boolean;
}

/**
 * Checks if a track meets all music criteria:
 * - Not a livestream or upcoming broadcast
 * - Duration between 45 seconds and 10 minutes (600 seconds)
 * - Does not match non-music title keywords (podcasts, full albums, etc.)
 */
export function isMusicTrack(
  candidate: MusicTrackCandidate | null | undefined
): boolean {
  if (!candidate) return false;

  if (candidate.isLive || candidate.isUpcoming) {
    return false;
  }

  const duration =
    typeof candidate.duration === "number" && !isNaN(candidate.duration)
      ? candidate.duration
      : 0;

  if (duration < MIN_TRACK_DURATION || duration > MAX_TRACK_DURATION) {
    return false;
  }

  const title = candidate.title || "";
  if (NON_MUSIC_TITLE_REGEX.test(title)) {
    return false;
  }

  return true;
}
