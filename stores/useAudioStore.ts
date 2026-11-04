import { create } from 'zustand';
import { Track } from '@/types/track';
import { toast } from 'sonner';

export interface AudioState {
  // State
  currentTrack: Track | null;
  isPlaying: boolean;
  isLoadingStream: boolean;
  isAutoQueueLoading: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  queue: Track[];
  queueIndex: number;
  isQueueOpen: boolean;
  toastMessage: string | null;

  // Actions
  setToastMessage: (msg: string | null) => void;
  setQueue: (tracks: Track[], startIndex?: number) => void;
  playTrack: (track: Track) => Promise<void>;
  playQueueIndex: (index: number) => Promise<void>;
  playWithAutoQueue: (selectedTrack: Track, allAvailableTracks: Track[]) => Promise<void>;
  fetchAutoQueue: (track: Track) => Promise<void>;
  clearQueue: () => void;
  removeFromQueue: (index: number) => void;
  reorderQueue: (fromIndex: number, toIndex: number) => void;
  toggleQueue: () => void;
  setIsQueueOpen: (open: boolean) => void;
  togglePlay: () => void;
  seek: (seconds: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  playNext: () => void;
  playPrevious: () => void;
}

// Client-safe Audio singleton initialization
let audioInstance: HTMLAudioElement | null = null;
let consecutiveErrors = 0;
let skipTimer: ReturnType<typeof setTimeout> | null = null;
let retryAttemptedForTrackId: string | null = null;
let lastNonZeroVolume = 0.8;

/**
 * Update native Navigator Media Session metadata
 */
const updateMediaSession = (track: Track | null) => {
  if (typeof window === 'undefined' || !('mediaSession' in navigator)) {
    return;
  }

  if (!track) {
    try {
      navigator.mediaSession.metadata = null;
    } catch {}
    return;
  }

  try {
    const artworkSrc =
      track.cover_url ||
      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=512&auto=format&fit=crop&q=80';

    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title || 'Unknown Title',
      artist: track.artist || 'Unknown Artist',
      album: track.album || 'BeatSync',
      artwork: [
        {
          src: artworkSrc,
          sizes: '512x512',
          type: 'image/jpeg',
        },
      ],
    });
  } catch (err) {
    console.warn('[BeatSync Audio] Error setting mediaSession metadata:', err);
  }
};

/**
 * Register native Navigator Media Session action handlers
 */
const registerMediaSessionHandlers = (get: () => AudioState) => {
  if (typeof window === 'undefined' || !('mediaSession' in navigator)) {
    return;
  }

  const actions: Array<{
    action: MediaSessionAction;
    handler: MediaSessionActionHandler;
  }> = [
    { action: 'play', handler: () => get().togglePlay() },
    { action: 'pause', handler: () => get().togglePlay() },
    { action: 'nexttrack', handler: () => get().playNext() },
    { action: 'previoustrack', handler: () => get().playPrevious() },
    {
      action: 'seekto',
      handler: (details) => {
        if (typeof details.seekTime === 'number') {
          get().seek(details.seekTime);
        }
      },
    },
  ];

  for (const { action, handler } of actions) {
    try {
      navigator.mediaSession.setActionHandler(action, handler);
    } catch {
      // Ignored for browser engines without support for specific actions
    }
  }
};

const getAudioElement = (): HTMLAudioElement | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  if (!audioInstance) {
    audioInstance = new Audio();
    audioInstance.preload = 'metadata';
    audioInstance.volume = 0.8;
    (window as any).__audioInstance = audioInstance;
  }

  return audioInstance;
};

interface ResolvedStream {
  url: string;
  isFallback: boolean;
}

// Helper: resolve stream URL for track
const resolveAudioStreamUrl = async (track: Track): Promise<ResolvedStream> => {
  // If track already has direct external audio URL, use it directly
  if (
    track.audio_url &&
    track.audio_url.startsWith('http') &&
    !track.audio_url.includes('/api/stream')
  ) {
    return { url: track.audio_url, isFallback: false };
  }

  try {
    const res = await fetch(`/api/stream?id=${encodeURIComponent(track.id)}&json=true`);
    if (res.ok) {
      const data = await res.json();
      if (data.streamUrl) {
        return {
          url: data.streamUrl,
          isFallback: Boolean(data.isFallback),
        };
      }
    }
  } catch (err) {
    console.warn('[BeatSync Audio] Error resolving direct stream URL:', err);
  }

  // Fallback to streaming proxy route
  return {
    url: `/api/stream?id=${encodeURIComponent(track.id)}`,
    isFallback: false,
  };
};

const scheduleSkipNext = (
  playNextFn: () => void,
  set: (state: Partial<AudioState>) => void,
  queueLength: number
) => {
  if (skipTimer) {
    clearTimeout(skipTimer);
    skipTimer = null;
  }

  consecutiveErrors++;
  if (consecutiveErrors >= 3) {
    toast.error('Playback stopped after multiple stream errors. Please select another track.', { id: 'stream-status' });
    set({
      isPlaying: false,
      isLoadingStream: false,
      toastMessage: 'Playback stopped after multiple stream errors. Please select another track.',
    });
    return;
  }

  if (queueLength > 1) {
    skipTimer = setTimeout(() => {
      skipTimer = null;
      playNextFn();
    }, 1500);
  }
};

export const useAudioStore = create<AudioState>((set, get) => {
  // Initialize listeners on client side
  if (typeof window !== 'undefined') {
    const audio = getAudioElement();

    if (audio) {
      registerMediaSessionHandlers(get);

      audio.addEventListener('timeupdate', () => {
        set({ currentTime: audio.currentTime });

        if (
          typeof window !== 'undefined' &&
          'mediaSession' in navigator &&
          'setPositionState' in navigator.mediaSession
        ) {
          try {
            const d = audio.duration;
            if (Number.isFinite(d) && d > 0) {
              navigator.mediaSession.setPositionState({
                duration: d,
                playbackRate: audio.playbackRate || 1,
                position: Math.min(audio.currentTime, d),
              });
            }
          } catch {}
        }
      });

      audio.addEventListener('loadedmetadata', () => {
        const audioDuration = Number.isFinite(audio.duration) ? audio.duration : 0;
        set({
          duration: audioDuration || get().currentTrack?.duration || 0,
        });
      });

      audio.addEventListener('durationchange', () => {
        if (Number.isFinite(audio.duration) && audio.duration > 0) {
          set({ duration: audio.duration });
        }
      });

      // Auto-advance to next track when playback ends
      audio.addEventListener('ended', () => {
        if (audio.currentTime > 1) {
          get().playNext();
        }
      });

      audio.addEventListener('playing', () => {
        consecutiveErrors = 0;
        retryAttemptedForTrackId = null;
        if (skipTimer) {
          clearTimeout(skipTimer);
          skipTimer = null;
        }
        set({ isPlaying: true, isLoadingStream: false });
        if (typeof window !== 'undefined' && 'mediaSession' in navigator) {
          navigator.mediaSession.playbackState = 'playing';
        }
        if (
          get().toastMessage === 'Re-routing stream...' ||
          get().toastMessage === 'Stream failed. Auto-retrying...'
        ) {
          set({ toastMessage: null });
        }
      });

      audio.addEventListener('play', () => {
        set({ isPlaying: true });
        if (typeof window !== 'undefined' && 'mediaSession' in navigator) {
          navigator.mediaSession.playbackState = 'playing';
        }
      });

      audio.addEventListener('pause', () => {
        set({ isPlaying: false });
        if (typeof window !== 'undefined' && 'mediaSession' in navigator) {
          navigator.mediaSession.playbackState = 'paused';
        }
      });

      // Audio error recovery & streaming fallback
      const handleAudioError = async (e: Event | string) => {
        console.error('[BeatSync Audio] Error playing audio:', e);
        const { currentTrack, queue } = get();

        if (!currentTrack) {
          set({ isPlaying: false, isLoadingStream: false });
          return;
        }

        // On error, toast with sonner: toast.error("Stream failed. Auto-retrying...")
        toast.error("Stream failed. Auto-retrying...", { id: 'stream-status' });

        // Check if an automatic retry has already been attempted for this track
        const canRetry = retryAttemptedForTrackId !== currentTrack.id;

        if (canRetry) {
          retryAttemptedForTrackId = currentTrack.id;
          console.warn(
            `[BeatSync Audio] Stream playback error on "${currentTrack.title}". Attempting force-cache refresh retry...`
          );

          set({
            isPlaying: false,
            isLoadingStream: true,
            toastMessage: 'Stream failed. Auto-retrying...',
          });

          try {
            const currentAudio = getAudioElement();
            if (!currentAudio || get().currentTrack?.id !== currentTrack.id) return;

            const preservedTime = currentAudio.currentTime || get().currentTime || 0;

            // Attempt one re-fetch with force-cache refresh
            const freshRes = await fetch(
              `/api/stream?id=${encodeURIComponent(currentTrack.id)}&json=true&retry=1&refresh=true&t=${Date.now()}`,
              {
                cache: 'no-store',
                headers: {
                  'Cache-Control': 'no-cache, no-store, must-revalidate',
                  Pragma: 'no-cache',
                },
              }
            );

            let freshStreamUrl = `/api/stream?id=${encodeURIComponent(currentTrack.id)}&retry=1&t=${Date.now()}`;
            if (freshRes.ok) {
              const data = await freshRes.json();
              if (data && data.streamUrl) {
                freshStreamUrl = data.streamUrl;
              }
            }

            currentAudio.src = freshStreamUrl;
            if (preservedTime > 0) {
              try {
                currentAudio.currentTime = preservedTime;
              } catch {}
            }
            currentAudio.load();

            const retryPromise = currentAudio.play();
            if (retryPromise !== undefined) {
              await retryPromise;
              consecutiveErrors = 0;
              toast.success('Stream recovered', { id: 'stream-status' });
              set({
                isPlaying: true,
                isLoadingStream: false,
                toastMessage: null,
              });
            }
          } catch (retryErr: any) {
            if (retryErr?.name !== 'AbortError' && retryErr?.name !== 'NotAllowedError') {
              console.warn('[BeatSync Audio] Recovery retry failed:', retryErr);
            }
            toast.error('Unable to stream this track. Skipping...', { id: 'stream-status' });
            set({
              isPlaying: false,
              isLoadingStream: false,
              toastMessage: 'Unable to stream this track. Skipping...',
            });
            scheduleSkipNext(() => get().playNext(), set, queue.length);
          }
        } else {
          // Retry was already attempted for this track and failed again
          console.error(
            `[BeatSync Audio] Stream recovery failed for "${currentTrack.title}". Skipping to next song.`
          );
          toast.error('Unable to stream this track. Skipping...', { id: 'stream-status' });
          set({
            isPlaying: false,
            isLoadingStream: false,
            toastMessage: 'Unable to stream this track. Skipping...',
          });
          scheduleSkipNext(() => get().playNext(), set, queue.length);
        }
      };

      // Bind audio.onerror and addEventListener
      audio.onerror = handleAudioError;
      audio.addEventListener('error', handleAudioError);
    }
  }

  return {
    currentTrack: null,
    isPlaying: false,
    isLoadingStream: false,
    isAutoQueueLoading: false,
    currentTime: 0,
    duration: 0,
    volume: 0.8,
    queue: [],
    queueIndex: -1,
    isQueueOpen: false,
    toastMessage: null,

    setToastMessage: (msg: string | null) => set({ toastMessage: msg }),
    toggleQueue: () => set((state) => ({ isQueueOpen: !state.isQueueOpen })),
    setIsQueueOpen: (open: boolean) => set({ isQueueOpen: open }),

    fetchAutoQueue: async (track: Track) => {
      if (!track || get().isAutoQueueLoading) return;

      set({ isAutoQueueLoading: true });
      try {
        const params = new URLSearchParams({
          id: track.id,
          artist: track.artist || '',
          title: track.title || '',
        });

        const res = await fetch(`/api/related?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          const relatedTracks: Track[] = data.tracks || [];

          if (relatedTracks.length > 0) {
            const { queue, queueIndex } = get();
            const existingIds = new Set(queue.map((t) => t.id));
            const newTracks = relatedTracks.filter((t) => !existingIds.has(t.id));

            if (newTracks.length > 0) {
              const insertPos = queueIndex >= 0 ? queueIndex + 1 : queue.length;
              const newQueue = [
                ...queue.slice(0, insertPos),
                ...newTracks,
                ...queue.slice(insertPos),
              ];

              set({ queue: newQueue });
            }
          }
        }
      } catch (err) {
        console.warn('[BeatSync Audio] Failed to fetch auto-queue related tracks:', err);
      } finally {
        set({ isAutoQueueLoading: false });
      }
    },

    setQueue: (tracks: Track[], startIndex = 0) => {
      if (!tracks || tracks.length === 0) {
        const audio = getAudioElement();
        if (audio) {
          audio.pause();
          audio.removeAttribute('src');
          audio.load();
        }
        set({
          queue: [],
          queueIndex: -1,
          currentTrack: null,
          isPlaying: false,
          isLoadingStream: false,
          currentTime: 0,
          duration: 0,
        });
        return;
      }

      const validIndex = Math.max(0, Math.min(startIndex, tracks.length - 1));

      set({
        queue: tracks,
        queueIndex: validIndex,
      });

      get().playQueueIndex(validIndex);
    },

    playTrack: async (track: Track) => {
      if (skipTimer) {
        clearTimeout(skipTimer);
        skipTimer = null;
      }
      consecutiveErrors = 0;
      retryAttemptedForTrackId = null;

      const audio = getAudioElement();
      const currentQueue = get().queue;

      let newIndex = currentQueue.findIndex((t) => t.id === track.id);
      let updatedQueue = currentQueue;

      // If track is not currently in the queue, add it
      if (newIndex === -1) {
        updatedQueue = [...currentQueue, track];
        newIndex = updatedQueue.length - 1;
      }

      set({
        currentTrack: track,
        queue: updatedQueue,
        queueIndex: newIndex,
        duration: track.duration || 0,
        currentTime: 0,
        isLoadingStream: true,
      });

      // Update native Navigator Media Session metadata & register action handlers
      updateMediaSession(track);
      registerMediaSessionHandlers(get);

      if (audio) {
        // SYNCHRONOUS playback start to preserve browser user activation
        const streamUrl = track.audio_url || `/api/stream?id=${encodeURIComponent(track.id)}`;

        if (audio.src !== streamUrl) {
          audio.src = streamUrl;
          audio.currentTime = 0;
          audio.load();
        }

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              consecutiveErrors = 0;
              set({ isPlaying: true, isLoadingStream: false });
            })
            .catch((error) => {
              if (error.name !== 'AbortError' && error.name !== 'NotAllowedError') {
                console.warn('[BeatSync Audio] Playback prevented:', error);
              }
              set({ isPlaying: false, isLoadingStream: false });
            });
        }
      } else {
        set({ isLoadingStream: false });
      }

      // Background task: fetch 10-15 similar songs and append into queue (Song Radio)
      get().fetchAutoQueue(track);
    },

    playQueueIndex: async (index: number) => {
      const { queue } = get();
      if (!queue || index < 0 || index >= queue.length) return;

      retryAttemptedForTrackId = null;
      const targetTrack = queue[index];

      set({
        queueIndex: index,
        currentTrack: targetTrack,
        currentTime: 0,
        duration: targetTrack.duration || 0,
        isLoadingStream: true,
      });

      // Update native Navigator Media Session metadata & register action handlers
      updateMediaSession(targetTrack);
      registerMediaSessionHandlers(get);

      const audio = getAudioElement();
      if (audio) {
        const streamUrl = targetTrack.audio_url || `/api/stream?id=${encodeURIComponent(targetTrack.id)}`;

        if (audio.src !== streamUrl) {
          audio.src = streamUrl;
          audio.currentTime = 0;
          audio.load();
        }

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              consecutiveErrors = 0;
              set({ isPlaying: true, isLoadingStream: false });
            })
            .catch((error) => {
              if (error.name !== 'AbortError' && error.name !== 'NotAllowedError') {
                console.warn('[BeatSync Audio] Playback prevented:', error);
              }
              set({ isPlaying: false, isLoadingStream: false });
            });
        }
      } else {
        set({ isLoadingStream: false });
      }

      // If queue has fewer than 2 songs left, automatically fetch and append more related tracks
      if (index >= queue.length - 2) {
        get().fetchAutoQueue(targetTrack);
      }
    },

    playWithAutoQueue: async (selectedTrack: Track, allAvailableTracks: Track[]) => {
      if (!selectedTrack) return;
      if (skipTimer) {
        clearTimeout(skipTimer);
        skipTimer = null;
      }
      consecutiveErrors = 0;
      retryAttemptedForTrackId = null;

      // Filter initial candidates excluding selectedTrack
      const candidates = (allAvailableTracks || []).filter(
        (t) => t.id !== selectedTrack.id
      );

      const initialQueue = [selectedTrack, ...candidates.slice(0, 15)];

      set({
        queue: initialQueue,
        queueIndex: 0,
        currentTrack: selectedTrack,
        currentTime: 0,
        duration: selectedTrack.duration || 0,
        isLoadingStream: true,
      });

      // Update native Navigator Media Session metadata & register action handlers
      updateMediaSession(selectedTrack);
      registerMediaSessionHandlers(get);

      const audio = getAudioElement();
      if (audio) {
        const streamUrl = selectedTrack.audio_url || `/api/stream?id=${encodeURIComponent(selectedTrack.id)}`;

        if (audio.src !== streamUrl) {
          audio.src = streamUrl;
          audio.currentTime = 0;
          audio.load();
        }

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              consecutiveErrors = 0;
              set({ isPlaying: true, isLoadingStream: false });
            })
            .catch((err) => {
              if (err.name !== 'AbortError' && err.name !== 'NotAllowedError') {
                console.warn('[BeatSync Audio] Autoplay prevented:', err);
              }
              set({ isPlaying: false, isLoadingStream: false });
            });
        }
      } else {
        set({ isLoadingStream: false });
      }

      // Enrich queue with Song Radio related tracks
      get().fetchAutoQueue(selectedTrack);
    },

    clearQueue: () => {
      const { currentTrack } = get();
      if (currentTrack) {
        set({
          queue: [currentTrack],
          queueIndex: 0,
        });
      } else {
        set({
          queue: [],
          queueIndex: -1,
        });
      }
    },

    removeFromQueue: (index: number) => {
      const { queue, queueIndex } = get();
      if (index < 0 || index >= queue.length) return;

      const newQueue = queue.filter((_, i) => i !== index);
      let newQueueIndex = queueIndex;

      if (index < queueIndex) {
        newQueueIndex = Math.max(0, queueIndex - 1);
      } else if (index === queueIndex) {
        if (newQueue.length > 0) {
          newQueueIndex = Math.min(queueIndex, newQueue.length - 1);
          get().playQueueIndex(newQueueIndex);
          return;
        } else {
          get().setQueue([]);
          return;
        }
      }

      set({
        queue: newQueue,
        queueIndex: newQueueIndex,
      });
    },

    reorderQueue: (fromIndex: number, toIndex: number) => {
      const { queue, queueIndex } = get();
      if (
        fromIndex < 0 ||
        fromIndex >= queue.length ||
        toIndex < 0 ||
        toIndex >= queue.length ||
        fromIndex === toIndex
      ) {
        return;
      }

      const updated = [...queue];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);

      let newIndex = queueIndex;
      if (queueIndex === fromIndex) {
        newIndex = toIndex;
      } else if (fromIndex < queueIndex && toIndex >= queueIndex) {
        newIndex = queueIndex - 1;
      } else if (fromIndex > queueIndex && toIndex <= queueIndex) {
        newIndex = queueIndex + 1;
      }

      set({
        queue: updated,
        queueIndex: newIndex,
      });
    },

    togglePlay: () => {
      const audio = getAudioElement();
      const { isPlaying, currentTrack, queue, queueIndex } = get();

      if (!currentTrack) {
        if (queue.length > 0) {
          const indexToPlay = queueIndex >= 0 ? queueIndex : 0;
          get().playQueueIndex(indexToPlay);
        }
        return;
      }

      if (audio) {
        if (isPlaying) {
          audio.pause();
          set({ isPlaying: false });
        } else {
          const playPromise = audio.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                set({ isPlaying: true });
              })
              .catch((error) => {
                if (error.name !== 'AbortError') {
                  console.warn('[BeatSync Audio] Playback prevented:', error);
                }
                set({ isPlaying: false });
              });
          }
        }
      } else {
        set({ isPlaying: !isPlaying });
      }
    },

    seek: (seconds: number) => {
      const audio = getAudioElement();
      const { duration } = get();
      const safeDuration = duration > 0 ? duration : Infinity;
      const targetTime = Math.max(0, Math.min(seconds, safeDuration));

      if (audio) {
        try {
          audio.currentTime = targetTime;
        } catch (err) {
          console.warn('[BeatSync Audio] Error seeking:', err);
        }
      }

      set({ currentTime: targetTime });
    },

    setVolume: (volume: number) => {
      const audio = getAudioElement();
      const clampedVolume = Math.max(0, Math.min(1, volume));

      if (clampedVolume > 0) {
        lastNonZeroVolume = clampedVolume;
      }

      if (audio) {
        audio.volume = clampedVolume;
      }

      set({ volume: clampedVolume });
    },

    toggleMute: () => {
      const { volume } = get();
      if (volume > 0) {
        lastNonZeroVolume = volume;
        get().setVolume(0);
      } else {
        get().setVolume(lastNonZeroVolume || 0.8);
      }
    },

    playNext: () => {
      const { queue, queueIndex, currentTrack } = get();
      if (!queue || queue.length === 0) return;

      const nextIndex = queueIndex + 1;
      if (nextIndex < queue.length) {
        get().playQueueIndex(nextIndex);

        // If queue has fewer than 2 songs left, automatically fetch and append more related tracks
        if (nextIndex >= queue.length - 2) {
          const current = queue[nextIndex];
          if (current) {
            get().fetchAutoQueue(current);
          }
        }
      } else {
        // Reached end of queue: fetch more related tracks or loop
        if (currentTrack) {
          get().fetchAutoQueue(currentTrack).then(() => {
            const refreshedQueue = get().queue;
            if (refreshedQueue.length > queueIndex + 1) {
              get().playQueueIndex(queueIndex + 1);
            } else {
              get().playQueueIndex(0);
            }
          });
        } else {
          get().playQueueIndex(0);
        }
      }
    },

    playPrevious: () => {
      const { queue, queueIndex, currentTime } = get();
      if (!queue || queue.length === 0) return;

      // If current time > 3 seconds, restart current track
      if (currentTime > 3) {
        get().seek(0);
        const audio = getAudioElement();
        if (audio && audio.paused) {
          audio.play().catch(() => {});
          set({ isPlaying: true });
        }
        return;
      }

      // Otherwise jump to previous track in queue
      const prevIndex = (queueIndex - 1 + queue.length) % queue.length;
      get().playQueueIndex(prevIndex);
    },
  };
});

if (typeof window !== 'undefined') {
  (window as any).__useAudioStore = useAudioStore;
}
