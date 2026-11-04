import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Track } from "@/types/track";
import { MOCK_TRACKS } from "@/lib/mock-tracks";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { toast } from "sonner";

const CLIENT_ID_STORAGE_KEY = "beatsync_client_uuid";

/**
 * Retrieves or generates a persistent client UUID for user identification.
 */
export const getClientIdentifier = (): string => {
  if (typeof window === "undefined") {
    return "anonymous-user";
  }

  let clientId = localStorage.getItem(CLIENT_ID_STORAGE_KEY);
  if (!clientId) {
    clientId =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : "client-" + Math.random().toString(36).substring(2, 15);
    localStorage.setItem(CLIENT_ID_STORAGE_KEY, clientId);
  }
  return clientId;
};

export interface LikesState {
  likedTracks: Track[];
  likedTrackIds: string[];
  toggleLike: (track: Track | string) => void;
  isLiked: (trackId: string) => boolean;
  getLikedTracks: () => Track[];
  syncLikes: () => Promise<void>;
}

export const useLikesStore = create<LikesState>()(
  persist(
    (set, get) => ({
      likedTracks: [],
      likedTrackIds: [],

      isLiked: (trackId: string) => {
        if (!trackId) return false;
        const { likedTrackIds, likedTracks } = get();
        return (
          likedTrackIds.includes(trackId) ||
          likedTracks.some((t) => t.id === trackId)
        );
      },

      getLikedTracks: () => {
        return get().likedTracks || [];
      },

      toggleLike: (trackInput: Track | string) => {
        const { likedTracks } = get();

        // Resolve full track object
        let track: Track;
        let trackId: string;

        if (typeof trackInput === "string") {
          trackId = trackInput.trim();
          const existing = likedTracks.find((t) => t.id === trackId);
          if (existing) {
            track = existing;
          } else {
            const mock = MOCK_TRACKS.find((t) => t.id === trackId);
            track = mock || {
              id: trackId,
              title: "Liked Track",
              artist: "Unknown Artist",
              album: "Liked Songs",
              duration: 180,
              cover_url: `https://i.ytimg.com/vi/${trackId}/hqdefault.jpg`,
              audio_url: `/api/stream?id=${encodeURIComponent(trackId)}`,
            };
          }
        } else {
          track = trackInput;
          trackId = track.id;
        }

        if (!trackId) return;

        const isCurrentlyLiked = likedTracks.some((t) => t.id === trackId);

        // Prepend when liked, remove when unliked
        const nextLikedTracks = isCurrentlyLiked
          ? likedTracks.filter((t) => t.id !== trackId)
          : [track, ...likedTracks.filter((t) => t.id !== trackId)];

        const nextLikedTrackIds = nextLikedTracks.map((t) => t.id);

        set({
          likedTracks: nextLikedTracks,
          likedTrackIds: nextLikedTrackIds,
        });

        // Notifications
        if (isCurrentlyLiked) {
          toast.info("Removed from Liked Songs");
        } else {
          toast.success("Added to Liked Songs");
        }

        // Background sync to Supabase if configured
        if (!isSupabaseConfigured || typeof window === "undefined") {
          return;
        }

        (async () => {
          try {
            const userIdentifier = getClientIdentifier();
            if (isCurrentlyLiked) {
              await supabase
                .from("liked_tracks")
                .delete()
                .eq("track_id", trackId)
                .eq("user_identifier", userIdentifier);
            } else {
              await supabase.from("liked_tracks").upsert(
                {
                  track_id: trackId,
                  user_identifier: userIdentifier,
                },
                { onConflict: "track_id,user_identifier" }
              );
            }
          } catch (err) {
            console.warn("[BeatSync Likes] Background Supabase sync error:", err);
          }
        })();
      },

      syncLikes: async () => {
        if (!isSupabaseConfigured || typeof window === "undefined") {
          return;
        }

        try {
          const userIdentifier = getClientIdentifier();
          const { data, error } = await supabase
            .from("liked_tracks")
            .select("track_id")
            .eq("user_identifier", userIdentifier);

          if (error || !data || !Array.isArray(data)) {
            return;
          }

          const remoteTrackIds = data.map(
            (row: { track_id: string }) => row.track_id
          );
          const currentTracks = get().likedTracks;
          const currentIds = get().likedTrackIds;

          // Merge IDs
          const allIds = Array.from(new Set([...currentIds, ...remoteTrackIds]));

          // Build merged tracks array
          const mergedTracks: Track[] = [...currentTracks];
          for (const rid of remoteTrackIds) {
            if (!mergedTracks.some((t) => t.id === rid)) {
              const mock = MOCK_TRACKS.find((m) => m.id === rid);
              if (mock) {
                mergedTracks.push(mock);
              } else {
                mergedTracks.push({
                  id: rid,
                  title: "Saved Track",
                  artist: "YouTube Music",
                  album: "Liked Songs",
                  duration: 180,
                  cover_url: `https://i.ytimg.com/vi/${rid}/hqdefault.jpg`,
                  audio_url: `/api/stream?id=${encodeURIComponent(rid)}`,
                });
              }
            }
          }

          set({
            likedTracks: mergedTracks,
            likedTrackIds: allIds,
          });
        } catch (err) {
          console.warn("[BeatSync Likes] Error during syncLikes:", err);
        }
      },
    }),
    {
      name: "beatsync_liked_v1",
      storage: createJSONStorage(() =>
        typeof window !== "undefined"
          ? localStorage
          : {
              getItem: () => null,
              setItem: () => {},
              removeItem: () => {},
            }
      ),
      partialize: (state) => ({
        likedTracks: state.likedTracks,
        likedTrackIds: state.likedTrackIds,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // Keep likedTrackIds in sync with likedTracks
        if (state.likedTracks && state.likedTracks.length > 0) {
          state.likedTrackIds = state.likedTracks.map((t) => t.id);
        } else if (typeof window !== "undefined") {
          // Check for migration from previous storage keys
          try {
            const prevStorage =
              localStorage.getItem("beatsync_liked_tracks_v1") ||
              localStorage.getItem("soundwave_likes");
            if (prevStorage) {
              const parsed = JSON.parse(prevStorage);
              const prevTracks: Track[] =
                parsed?.state?.likedTracks || [];
              const prevIds: string[] =
                parsed?.state?.likedTrackIds || [];

              if (prevTracks.length > 0) {
                state.likedTracks = prevTracks;
                state.likedTrackIds = prevTracks.map((t) => t.id);
              } else if (prevIds.length > 0) {
                const migratedTracks = prevIds.map((id) => {
                  const mock = MOCK_TRACKS.find((t) => t.id === id);
                  return (
                    mock || {
                      id,
                      title: "Liked Song",
                      artist: "Artist",
                      album: "Liked Songs",
                      duration: 180,
                      cover_url: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
                      audio_url: `/api/stream?id=${encodeURIComponent(id)}`,
                    }
                  );
                });
                state.likedTracks = migratedTracks;
                state.likedTrackIds = prevIds;
              }
            }
          } catch {
            // Ignore migration parse error
          }
        }
      },
    }
  )
);

export default useLikesStore;
