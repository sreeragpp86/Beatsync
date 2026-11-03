import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

const CLIENT_ID_STORAGE_KEY = 'soundwave_client_uuid';

/**
 * Retrieves or generates a persistent client UUID for user identification.
 * Uses crypto.randomUUID() and persists across sessions in localStorage.
 */
export const getClientIdentifier = (): string => {
  if (typeof window === 'undefined') {
    return 'anonymous-user';
  }

  let clientId = localStorage.getItem(CLIENT_ID_STORAGE_KEY);
  if (!clientId) {
    clientId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : 'client-' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem(CLIENT_ID_STORAGE_KEY, clientId);
  }
  return clientId;
};

export interface LikesState {
  likedTrackIds: string[];
  toggleLike: (trackId: string) => Promise<void>;
  isLiked: (trackId: string) => boolean;
  syncLikes: () => Promise<void>;
}

export const useLikesStore = create<LikesState>()(
  persist(
    (set, get) => ({
      likedTrackIds: [],

      isLiked: (trackId: string) => {
        return get().likedTrackIds.includes(trackId);
      },

      toggleLike: async (trackId: string) => {
        const { likedTrackIds } = get();
        const isCurrentlyLiked = likedTrackIds.includes(trackId);

        // 1. Optimistic local state update
        const nextLikedTrackIds = isCurrentlyLiked
          ? likedTrackIds.filter((id) => id !== trackId)
          : [...likedTrackIds, trackId];

        set({ likedTrackIds: nextLikedTrackIds });

        // 2. Background sync to Supabase if configured
        if (!isSupabaseConfigured || typeof window === 'undefined') {
          return;
        }

        try {
          const userIdentifier = getClientIdentifier();

          if (isCurrentlyLiked) {
            // Remove from Supabase
            const { error } = await supabase
              .from('liked_tracks')
              .delete()
              .eq('track_id', trackId)
              .eq('user_identifier', userIdentifier);

            if (error) {
              console.warn(
                `[SoundWave Likes] Failed to delete like in Supabase for track ${trackId}:`,
                error.message
              );
            }
          } else {
            // Upsert into Supabase
            const { error } = await supabase
              .from('liked_tracks')
              .upsert(
                {
                  track_id: trackId,
                  user_identifier: userIdentifier,
                },
                { onConflict: 'track_id,user_identifier' }
              );

            if (error) {
              console.warn(
                `[SoundWave Likes] Failed to save like in Supabase for track ${trackId}:`,
                error.message
              );
            }
          }
        } catch (err) {
          console.warn('[SoundWave Likes] Error during toggleLike sync:', err);
        }
      },

      syncLikes: async () => {
        if (!isSupabaseConfigured || typeof window === 'undefined') {
          return;
        }

        try {
          const userIdentifier = getClientIdentifier();
          const { data, error } = await supabase
            .from('liked_tracks')
            .select('track_id')
            .eq('user_identifier', userIdentifier);

          if (error) {
            console.warn(
              '[SoundWave Likes] Failed to fetch remote likes from Supabase:',
              error.message
            );
            return;
          }

          if (data && Array.isArray(data)) {
            const remoteTrackIds = data.map(
              (row: { track_id: string }) => row.track_id
            );
            const localTrackIds = get().likedTrackIds;

            // Merge unique IDs
            const merged = Array.from(
              new Set([...localTrackIds, ...remoteTrackIds])
            );
            set({ likedTrackIds: merged });
          }
        } catch (err) {
          console.warn('[SoundWave Likes] Error during syncLikes:', err);
        }
      },
    }),
    {
      name: 'soundwave_likes',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined'
          ? localStorage
          : {
              getItem: () => null,
              setItem: () => {},
              removeItem: () => {},
            }
      ),
      partialize: (state) => ({ likedTrackIds: state.likedTrackIds }),
    }
  )
);

export default useLikesStore;
