import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Track } from "@/types/track";
import { useLikesStore } from "@/stores/useLikesStore";
import { toast } from "sonner";
import { isMusicTrack } from "@/lib/music-filter";

export type VibeType = "balanced" | "deep-cuts" | "familiar" | "upbeat";
export type DynamicTrackReason = "Same Artist" | "Deep Cut" | "Vibe Match" | "Liked Radio" | "Related";

export interface DynamicTrack extends Track {
  queueSource?: "user" | "dynamic";
  recommendationReason?: DynamicTrackReason;
}

export interface DynamicQueueState {
  // Multi-Tier Queue State
  isDynamicQueueEnabled: boolean; // Optional: toggle between Dynamic Flow and Classic YouTube Queue
  userQueue: DynamicTrack[]; // Manual user "Play Next" list (highest priority)
  dynamicPool: DynamicTrack[]; // Rolling 6-track algorithmic buffer
  skippedTrackIds: string[]; // Set of track IDs skipped under 20 seconds
  currentVibe: VibeType;
  sessionHistory: string[]; // Last 50 plays to prevent duplicate within 30 plays
  isReplenishing: boolean;

  // Actions
  toggleDynamicQueue: () => void;
  setDynamicQueueEnabled: (enabled: boolean) => void;
  setVibe: (vibe: VibeType, referenceTrack?: Track | null) => Promise<void>;
  addToUserQueue: (track: Track, atStart?: boolean) => void;
  removeFromUserQueue: (trackId: string) => void;
  reorderUserQueue: (fromIndex: number, toIndex: number) => void;
  clearUserQueue: () => void;
  shuffleUserQueue: () => void;

  removeFromDynamicPool: (trackId: string, referenceTrack?: Track | null) => void;
  clearDynamicPool: () => void;

  recordSkip: (trackId: string, currentTime: number, artist?: string) => void;
  recordPlay: (track: Track) => void;
  getNextTrack: () => DynamicTrack | null;
  replenishPool: (referenceTrack?: Track | null) => Promise<void>;
  resetSessionHistory: () => void;
}

const POOL_TARGET_SIZE = 6;
const SESSION_HISTORY_DEDUP_LIMIT = 30;

export const useDynamicQueueStore = create<DynamicQueueState>()(
  persist(
    (set, get) => ({
      isDynamicQueueEnabled: true,
      userQueue: [],
      dynamicPool: [],
      skippedTrackIds: [],
      currentVibe: "balanced",
      sessionHistory: [],
      isReplenishing: false,

      toggleDynamicQueue: () => {
        const next = !get().isDynamicQueueEnabled;
        set({ isDynamicQueueEnabled: next });
        toast.info(
          next ? "Switched to Dynamic AI Queue Flow" : "Switched to Classic YouTube Queue",
          { duration: 1800, id: "queue-mode-toggle" }
        );
      },

      setDynamicQueueEnabled: (enabled: boolean) => {
        set({ isDynamicQueueEnabled: enabled });
        toast.info(
          enabled ? "Switched to Dynamic AI Queue Flow" : "Switched to Classic YouTube Queue",
          { duration: 1800, id: "queue-mode-toggle" }
        );
      },

      setVibe: async (vibe: VibeType, referenceTrack?: Track | null) => {
        set({ currentVibe: vibe, dynamicPool: [] });
        toast.success(`Queue Vibe set to: ${vibe.toUpperCase()}`, {
          duration: 1800,
          id: "queue-vibe-change",
        });
        await get().replenishPool(referenceTrack);
      },

      addToUserQueue: (track: Track, atStart = false) => {
        if (!track || !track.id) return;
        const dynamicItem: DynamicTrack = {
          ...track,
          queueSource: "user",
        };

        set((state) => {
          // Remove existing duplicate from userQueue
          const filtered = state.userQueue.filter((t) => t.id !== track.id);
          const updated = atStart ? [dynamicItem, ...filtered] : [...filtered, dynamicItem];

          // Also remove from dynamicPool if present to prevent duplicate upcoming items
          const updatedPool = state.dynamicPool.filter((t) => t.id !== track.id);

          return {
            userQueue: updated,
            dynamicPool: updatedPool,
          };
        });

        toast.success(
          atStart ? `Playing next: ${track.title}` : `Added to queue: ${track.title}`,
          { duration: 1800, id: `queue-add-${track.id}` }
        );
      },

      removeFromUserQueue: (trackId: string) => {
        set((state) => ({
          userQueue: state.userQueue.filter((t) => t.id !== trackId),
        }));
      },

      reorderUserQueue: (fromIndex: number, toIndex: number) => {
        set((state) => {
          const queue = [...state.userQueue];
          if (
            fromIndex < 0 ||
            fromIndex >= queue.length ||
            toIndex < 0 ||
            toIndex >= queue.length
          ) {
            return state;
          }
          const [moved] = queue.splice(fromIndex, 1);
          queue.splice(toIndex, 0, moved);
          return { userQueue: queue };
        });
      },

      clearUserQueue: () => {
        set({ userQueue: [] });
        toast.info("Cleared manual queue", { duration: 1500 });
      },

      shuffleUserQueue: () => {
        set((state) => {
          const list = [...state.userQueue];
          for (let i = list.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [list[i], list[j]] = [list[j], list[i]];
          }
          return { userQueue: list };
        });
        toast.success("Shuffled manual queue", { duration: 1500 });
      },

      removeFromDynamicPool: (trackId: string, referenceTrack?: Track | null) => {
        set((state) => ({
          dynamicPool: state.dynamicPool.filter((t) => t.id !== trackId),
        }));
        if (get().dynamicPool.length < 3) {
          get().replenishPool(referenceTrack);
        }
      },

      clearDynamicPool: () => {
        set({ dynamicPool: [] });
      },

      recordSkip: (trackId: string, currentTime: number, artist?: string) => {
        if (!trackId) return;

        // "When a track is skipped with currentTime < 20, add its ID to skippedTrackIds
        // and immediately purge tracks by the same artist from dynamicPool."
        if (currentTime < 20) {
          set((state) => {
            const cleanArtist = artist?.trim().toLowerCase();
            const skipped = state.skippedTrackIds.includes(trackId)
              ? state.skippedTrackIds
              : [...state.skippedTrackIds, trackId];

            const purgedPool = cleanArtist
              ? state.dynamicPool.filter(
                  (t) => (t.artist || "").trim().toLowerCase() !== cleanArtist
                )
              : state.dynamicPool;

            return {
              skippedTrackIds: skipped,
              dynamicPool: purgedPool,
            };
          });

          console.log(
            `[BeatSync Queue] Track skipped early (<20s): ${trackId}. Purged same artist "${artist}" from dynamic pool.`
          );
        }
      },

      recordPlay: (track: Track) => {
        if (!track || !track.id) return;
        set((state) => {
          const history = state.sessionHistory.filter((id) => id !== track.id);
          const updated = [...history, track.id].slice(-50);
          return { sessionHistory: updated };
        });
      },

      getNextTrack: () => {
        const { userQueue, dynamicPool } = get();

        // Tier 1: User Manual Queue (Absolute Precedence)
        if (userQueue.length > 0) {
          const [nextTrack, ...remainingUserQueue] = userQueue;
          set({ userQueue: remainingUserQueue });
          get().recordPlay(nextTrack);

          if (get().dynamicPool.length < 3) {
            get().replenishPool(nextTrack);
          }
          return nextTrack;
        }

        // Tier 2: Algorithmic Dynamic Pool
        if (dynamicPool.length > 0) {
          const [nextTrack, ...remainingPool] = dynamicPool;
          set({ dynamicPool: remainingPool });
          get().recordPlay(nextTrack);

          if (remainingPool.length < 3) {
            get().replenishPool(nextTrack);
          }
          return nextTrack;
        }

        return null;
      },

      replenishPool: async (referenceTrack?: Track | null) => {
        const state = get();
        if (state.isReplenishing) return;
        if (state.dynamicPool.length >= POOL_TARGET_SIZE) return;

        set({ isReplenishing: true });

        try {
          const refTrack = referenceTrack;
          const currentVibe = state.currentVibe;
          const neededCount = POOL_TARGET_SIZE - state.dynamicPool.length;

          // Deduplication sets
          const recent30History = new Set(
            state.sessionHistory.slice(-SESSION_HISTORY_DEDUP_LIMIT)
          );
          const skippedSet = new Set(state.skippedTrackIds);
          const existingIds = new Set([
            ...(refTrack?.id ? [refTrack.id] : []),
            ...state.userQueue.map((t) => t.id),
            ...state.dynamicPool.map((t) => t.id),
          ]);

          const candidates: DynamicTrack[] = [];

          // 1. If vibe is 'familiar', interleave tracks from localStorage liked tracks matching genre
          if (currentVibe === "familiar") {
            try {
              const likedTracks = useLikesStore.getState().likedTracks || [];
              const refGenre = (refTrack?.genre || "").toLowerCase().trim();
              const refArtist = (refTrack?.artist || "").toLowerCase().trim();

              const matchingLiked = likedTracks.filter((t) => {
                if (existingIds.has(t.id) || skippedSet.has(t.id) || recent30History.has(t.id)) {
                  return false;
                }
                const sameArtist = (t.artist || "").toLowerCase().trim() === refArtist;
                const sameGenre =
                  refGenre && (t.genre || "").toLowerCase().trim() === refGenre;
                return sameArtist || sameGenre;
              });

              const otherLiked = likedTracks.filter(
                (t) =>
                  !existingIds.has(t.id) &&
                  !skippedSet.has(t.id) &&
                  !recent30History.has(t.id) &&
                  !matchingLiked.some((m) => m.id === t.id)
              );

              const familiarPicks = [...matchingLiked, ...otherLiked].slice(0, 3);
              for (const track of familiarPicks) {
                candidates.push({
                  ...track,
                  queueSource: "dynamic",
                  recommendationReason: "Liked Radio",
                });
                existingIds.add(track.id);
              }
            } catch (err) {
              console.warn("[BeatSync Queue] Error reading liked tracks for familiar vibe:", err);
            }
          }

          // 2. Fetch algorithmic candidates from /api/related
          if (refTrack?.id) {
            const url = `/api/related?id=${encodeURIComponent(refTrack.id)}&vibe=${currentVibe}&artist=${encodeURIComponent(refTrack.artist || "")}&title=${encodeURIComponent(refTrack.title || "")}`;
            const res = await fetch(url);
            if (res.ok) {
              const data = await res.json();
              const fetchedTracks: Track[] = data.tracks || [];

              for (const track of fetchedTracks) {
                if (
                  !isMusicTrack(track) ||
                  existingIds.has(track.id) ||
                  skippedSet.has(track.id) ||
                  recent30History.has(track.id)
                ) {
                  continue;
                }

                // Determine badge reason
                let reason: DynamicTrackReason = "Vibe Match";
                const isSameArtist =
                  refTrack.artist &&
                  (track.artist || "").toLowerCase().trim() ===
                    refTrack.artist.toLowerCase().trim();

                if (isSameArtist) {
                  reason = "Same Artist";
                } else if (currentVibe === "deep-cuts") {
                  reason = "Deep Cut";
                } else if (currentVibe === "familiar") {
                  reason = "Liked Radio";
                } else {
                  reason = "Vibe Match";
                }

                candidates.push({
                  ...track,
                  queueSource: "dynamic",
                  recommendationReason: reason,
                });
                existingIds.add(track.id);

                if (candidates.length >= neededCount + 2) break;
              }
            }
          }

          // 3. Fallback: if still under target, pick diverse tracks from catalog
          if (candidates.length < neededCount) {
            try {
              const catalogRes = await fetch("/api/search");
              if (catalogRes.ok) {
                const catalogData = await catalogRes.json();
                const catalogTracks: Track[] = catalogData.tracks || [];

                for (const track of catalogTracks) {
                  if (
                    !isMusicTrack(track) ||
                    existingIds.has(track.id) ||
                    skippedSet.has(track.id) ||
                    recent30History.has(track.id)
                  ) {
                    continue;
                  }

                  candidates.push({
                    ...track,
                    queueSource: "dynamic",
                    recommendationReason: "Vibe Match",
                  });
                  existingIds.add(track.id);

                  if (candidates.length >= neededCount) break;
                }
              }
            } catch (catalogErr) {
              console.warn("[BeatSync Queue] Fallback catalog query error:", catalogErr);
            }
          }

          // Append candidates to dynamicPool up to POOL_TARGET_SIZE
          set((curr) => {
            const toAdd = candidates.slice(0, POOL_TARGET_SIZE - curr.dynamicPool.length);
            return {
              dynamicPool: [...curr.dynamicPool, ...toAdd],
            };
          });
        } catch (error) {
          console.error("[BeatSync Queue] Failed to replenish dynamic pool:", error);
        } finally {
          set({ isReplenishing: false });
        }
      },

      resetSessionHistory: () => {
        set({ sessionHistory: [], skippedTrackIds: [] });
      },
    }),
    {
      name: "beatsync_dynamic_queue_storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        isDynamicQueueEnabled: state.isDynamicQueueEnabled,
        userQueue: state.userQueue,
        dynamicPool: state.dynamicPool,
        skippedTrackIds: state.skippedTrackIds.slice(-50),
        currentVibe: state.currentVibe,
        sessionHistory: state.sessionHistory.slice(-50),
      }),
    }
  )
);
