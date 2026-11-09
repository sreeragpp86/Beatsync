import { create } from 'zustand';
import { Track } from '@/types/track';
import { toast } from 'sonner';
import { ytPlayerService } from '@/lib/youtube-player';
import { useDynamicQueueStore } from '@/stores/useDynamicQueueStore';

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
  isNowPlayingOpen: boolean;
  isShuffle: boolean;
  repeatMode: "off" | "all" | "one";
  toastMessage: string | null;

  // Actions
  setToastMessage: (msg: string | null) => void;
  openNowPlaying: () => void;
  closeNowPlaying: () => void;
  toggleNowPlaying: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  addToQueue: (track: Track, atStart?: boolean) => void;
  setQueue: (tracks: Track[], startIndex?: number) => void;
  playTrack: (track: Track) => Promise<void>;
  playQueueIndex: (index: number) => Promise<void>;
  playWithAutoQueue: (selectedTrack: Track, allAvailableTracks: Track[]) => Promise<void>;
  fetchAutoQueue: (track: Track) => Promise<void>;
  clearQueue: () => void;
  removeFromQueue: (index: number) => void;
  reorderQueue: (fromIndex: number, toIndex: number) => void;
  shuffleRemaining: () => void;
  toggleQueue: () => void;
  setIsQueueOpen: (open: boolean) => void;
  togglePlay: () => void;
  seek: (seconds: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  playNext: () => void;
  playPrevious: () => void;
  restartAudio: () => void;
}

// Client-safe Audio singleton initialization
let audioInstance: HTMLAudioElement | null = null;
let consecutiveErrors = 0;
let skipTimer: ReturnType<typeof setTimeout> | null = null;
let retryAttemptedForTrackId: string | null = null;
let lastNonZeroVolume = 0.8;

/**
 * Record recently played track in localStorage
 */
const recordRecentlyPlayed = (track: Track) => {
  if (typeof window === 'undefined' || !track || !track.id) return;
  try {
    const raw = localStorage.getItem('beatsync_recently_played_v1');
    const existing: Track[] = raw ? JSON.parse(raw) : [];
    const filtered = existing.filter((t) => t.id !== track.id);
    const updated = [track, ...filtered].slice(0, 12);
    localStorage.setItem('beatsync_recently_played_v1', JSON.stringify(updated));
  } catch (e) {
    console.warn('[BeatSync] Failed to save recently played track:', e);
  }
};

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
    (window as unknown as { __audioInstance?: HTMLAudioElement }).__audioInstance = audioInstance;
  }

  return audioInstance;
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

const setupAudioListeners = (
  audio: HTMLAudioElement,
  set: (state: Partial<AudioState> | ((state: AudioState) => Partial<AudioState>)) => void,
  get: () => AudioState
) => {
  registerMediaSessionHandlers(get);

  audio.addEventListener('timeupdate', () => {
    if (ytPlayerService.isYouTubeTrack(get().currentTrack)) return;
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
    if (ytPlayerService.isYouTubeTrack(get().currentTrack)) return;
    const audioDuration = Number.isFinite(audio.duration) ? audio.duration : 0;
    set({
      duration: audioDuration || get().currentTrack?.duration || 0,
    });
  });

  audio.addEventListener('durationchange', () => {
    if (ytPlayerService.isYouTubeTrack(get().currentTrack)) return;
    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      set({ duration: audio.duration });
    }
  });

  // Auto-advance to next track when playback ends
  audio.addEventListener('ended', () => {
    if (ytPlayerService.isYouTubeTrack(get().currentTrack)) return;
    if (audio.currentTime > 1) {
      get().playNext();
    }
  });

  audio.addEventListener('playing', () => {
    if (ytPlayerService.isYouTubeTrack(get().currentTrack)) return;
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
    if (ytPlayerService.isYouTubeTrack(get().currentTrack)) return;
    set({ isPlaying: true });
    if (typeof window !== 'undefined' && 'mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'playing';
    }
  });

  audio.addEventListener('pause', () => {
    if (ytPlayerService.isYouTubeTrack(get().currentTrack)) return;
    set({ isPlaying: false });
    if (typeof window !== 'undefined' && 'mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'paused';
    }
  });

  // Audio error recovery & streaming fallback
  const handleAudioError = async (e: Event | string) => {
    const { currentTrack, queue } = get();
    if (!currentTrack || ytPlayerService.isYouTubeTrack(currentTrack)) {
      return;
    }

    console.error('[BeatSync Audio] Error playing audio:', e);

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
      } catch (retryErr: unknown) {
        if (
          retryErr instanceof Error &&
          retryErr.name !== 'AbortError' &&
          retryErr.name !== 'NotAllowedError'
        ) {
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
};

/**
 * Universal playback dispatcher:
 * Routes YouTube tracks directly to the client-side YouTube IFrame player,
 * and routes local/direct media files to HTMLAudioElement.
 */
const startTrackPlayback = (
  track: Track,
  set: (state: Partial<AudioState> | ((state: AudioState) => Partial<AudioState>)) => void
) => {
  const isYt = ytPlayerService.isYouTubeTrack(track);

  if (isYt) {
    // 1. Detach and pause HTML5 audio element so it never plays fallback mock files
    const audio = getAudioElement();
    if (audio) {
      audio.pause();
      audio.removeAttribute('src');
    }

    // 2. Stream real YouTube audio directly inside the user's browser (residential IP)
    ytPlayerService.loadAndPlay(track.id, 0);
  } else {
    // 1. Pause YouTube player
    ytPlayerService.stop();

    // 2. Stream local mock / direct audio via HTMLAudioElement
    const audio = getAudioElement();
    if (audio) {
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
  }
};

export const useAudioStore = create<AudioState>((set, get) => {
  // Initialize listeners on client side
  if (typeof window !== 'undefined') {
    const audio = getAudioElement();
    if (audio) {
      setupAudioListeners(audio, set, get);
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
    isNowPlayingOpen: false,
    isShuffle: false,
    repeatMode: 'off',
    toastMessage: null,

    setToastMessage: (msg: string | null) => set({ toastMessage: msg }),
    openNowPlaying: () => set({ isNowPlayingOpen: true }),
    closeNowPlaying: () => set({ isNowPlayingOpen: false }),
    toggleNowPlaying: () => set((state) => ({ isNowPlayingOpen: !state.isNowPlayingOpen })),

    toggleShuffle: () => {
      const next = !get().isShuffle;
      set({ isShuffle: next });
      toast.info(next ? 'Shuffle enabled' : 'Shuffle disabled', {
        id: 'shuffle-status',
        duration: 1500,
      });
    },

    toggleRepeat: () => {
      const modes: Array<'off' | 'all' | 'one'> = ['off', 'all', 'one'];
      const current = get().repeatMode;
      const nextIdx = (modes.indexOf(current) + 1) % modes.length;
      const next = modes[nextIdx];
      set({ repeatMode: next });
      const labels = { off: 'Repeat off', all: 'Repeat all', one: 'Repeat track' };
      toast.info(labels[next], { id: 'repeat-status', duration: 1500 });
    },

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

    addToQueue: (track: Track, atStart = false) => {
      useDynamicQueueStore.getState().addToUserQueue(track, atStart);
    },

    setQueue: (tracks: Track[], startIndex = 0) => {
      if (!tracks || tracks.length === 0) {
        ytPlayerService.stop();
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
      recordRecentlyPlayed(track);

      startTrackPlayback(track, set);

      // Record play in dynamic queue session history and replenish pool if buffer is low
      useDynamicQueueStore.getState().recordPlay(track);
      if (useDynamicQueueStore.getState().dynamicPool.length < 3) {
        useDynamicQueueStore.getState().replenishPool(track);
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
      recordRecentlyPlayed(targetTrack);

      startTrackPlayback(targetTrack, set);

      // Record play in dynamic queue session history and replenish pool if buffer is low
      useDynamicQueueStore.getState().recordPlay(targetTrack);
      if (useDynamicQueueStore.getState().dynamicPool.length < 3) {
        useDynamicQueueStore.getState().replenishPool(targetTrack);
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

      startTrackPlayback(selectedTrack, set);

      // Record play and seed the dynamic pool with selected track's vibe
      useDynamicQueueStore.getState().recordPlay(selectedTrack);
      useDynamicQueueStore.getState().replenishPool(selectedTrack);

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
        ytPlayerService.stop();
        const audio = getAudioElement();
        if (audio) {
          audio.pause();
          audio.removeAttribute('src');
          audio.load();
        }
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

    shuffleRemaining: () => {
      const { queue, queueIndex } = get();
      if (!queue || queue.length <= 1) return;

      const upcomingStartIndex = queueIndex >= 0 ? queueIndex + 1 : 0;
      if (upcomingStartIndex >= queue.length) return;

      const keptTracks = queue.slice(0, upcomingStartIndex);
      const remainingTracks = [...queue.slice(upcomingStartIndex)];

      // Fisher-Yates shuffle
      for (let i = remainingTracks.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [remainingTracks[i], remainingTracks[j]] = [remainingTracks[j], remainingTracks[i]];
      }

      set({
        queue: [...keptTracks, ...remainingTracks],
      });
      toast.success("Shuffled upcoming queue", { duration: 1800 });
    },

    togglePlay: () => {
      const { isPlaying, currentTrack, queue, queueIndex } = get();

      if (!currentTrack) {
        if (queue.length > 0) {
          const indexToPlay = queueIndex >= 0 ? queueIndex : 0;
          get().playQueueIndex(indexToPlay);
        }
        return;
      }

      if (ytPlayerService.isYouTubeTrack(currentTrack)) {
        if (isPlaying) {
          ytPlayerService.pause();
        } else {
          ytPlayerService.play();
        }
      } else {
        const audio = getAudioElement();
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
      }
    },

    seek: (seconds: number) => {
      const { currentTrack, duration } = get();
      const safeDuration = duration > 0 ? duration : Infinity;
      const targetTime = Math.max(0, Math.min(seconds, safeDuration));

      if (ytPlayerService.isYouTubeTrack(currentTrack)) {
        ytPlayerService.seekTo(targetTime);
      } else {
        const audio = getAudioElement();
        if (audio) {
          try {
            audio.currentTime = targetTime;
          } catch (err) {
            console.warn('[BeatSync Audio] Error seeking:', err);
          }
        }
      }

      set({ currentTime: targetTime });
    },

    setVolume: (volume: number) => {
      const clampedVolume = Math.max(0, Math.min(1, volume));

      if (clampedVolume > 0) {
        lastNonZeroVolume = clampedVolume;
      }

      ytPlayerService.setVolume(clampedVolume);

      const audio = getAudioElement();
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
      const { queue, queueIndex, currentTrack, currentTime, isShuffle, repeatMode } = get();
      const isDynamicEnabled = useDynamicQueueStore.getState().isDynamicQueueEnabled;

      // 1. Record skip if skipped under 20s
      if (currentTrack) {
        useDynamicQueueStore
          .getState()
          .recordSkip(currentTrack.id, currentTime, currentTrack.artist);
      }

      // 2. Repeat One: restart current track
      if (repeatMode === 'one' && currentTrack) {
        get().seek(0);
        if (ytPlayerService.isYouTubeTrack(currentTrack)) {
          ytPlayerService.play();
        } else {
          const audio = getAudioElement();
          if (audio) {
            audio.currentTime = 0;
            audio.play().catch(() => {});
          }
        }
        set({ isPlaying: true });
        return;
      }

      // 3. Dynamic Queue Mode: Tier 1 (User Queue) & Tier 2 (Dynamic Pool) take priority
      if (isDynamicEnabled) {
        const nextDynamic = useDynamicQueueStore.getState().getNextTrack();
        if (nextDynamic) {
          get().playTrack(nextDynamic);
          return;
        }
      }

      if (!queue || queue.length === 0) return;

      // 4. Shuffle: select random track from queue (other than current)
      if (isShuffle && queue.length > 1) {
        const remainingIndices = queue
          .map((_, i) => i)
          .filter((i) => i !== queueIndex);
        const randomIdx =
          remainingIndices[Math.floor(Math.random() * remainingIndices.length)];
        get().playQueueIndex(randomIdx);
        return;
      }

      const nextIndex = queueIndex + 1;

      // 5. Classic YouTube sequential queue: when near end of queue, fetch next batch
      if (queue.length - nextIndex <= 3) {
        const referenceTrack = queue[nextIndex] || currentTrack || queue[queue.length - 1];
        if (referenceTrack) {
          get().fetchAutoQueue(referenceTrack);
        }
      }

      if (nextIndex < queue.length) {
        get().playQueueIndex(nextIndex);
      } else {
        // Reached end of queue before background fetch resolved: wait for related tracks or loop
        const referenceTrack = currentTrack || queue[queue.length - 1];
        if (referenceTrack) {
          if (isDynamicEnabled) {
            useDynamicQueueStore.getState().replenishPool(referenceTrack).then(() => {
              const fallbackNext = useDynamicQueueStore.getState().getNextTrack();
              if (fallbackNext) {
                get().playTrack(fallbackNext);
              } else {
                get().fetchAutoQueue(referenceTrack).then(() => {
                  const refreshedQueue = get().queue;
                  if (refreshedQueue.length > queueIndex + 1) {
                    get().playQueueIndex(queueIndex + 1);
                  } else {
                    get().playQueueIndex(0);
                  }
                });
              }
            });
          } else {
            get().fetchAutoQueue(referenceTrack).then(() => {
              const refreshedQueue = get().queue;
              if (refreshedQueue.length > queueIndex + 1) {
                get().playQueueIndex(queueIndex + 1);
              } else {
                get().playQueueIndex(0);
              }
            });
          }
        } else {
          get().playQueueIndex(0);
        }
      }
    },

    playPrevious: () => {
      const { queue, queueIndex, currentTime, currentTrack } = get();
      if (!queue || queue.length === 0) return;

      // If current time > 3 seconds, restart current track
      if (currentTime > 3) {
        get().seek(0);
        if (ytPlayerService.isYouTubeTrack(currentTrack)) {
          ytPlayerService.play();
          set({ isPlaying: true });
        } else {
          const audio = getAudioElement();
          if (audio && audio.paused) {
            audio.play().catch(() => {});
            set({ isPlaying: true });
          }
        }
        return;
      }

      // Otherwise jump to previous track in queue
      const prevIndex = (queueIndex - 1 + queue.length) % queue.length;
      get().playQueueIndex(prevIndex);
    },

    restartAudio: () => {
      if (typeof window === 'undefined') return;

      if (skipTimer) {
        clearTimeout(skipTimer);
        skipTimer = null;
      }
      consecutiveErrors = 0;
      retryAttemptedForTrackId = null;

      ytPlayerService.stop();

      if (audioInstance) {
        try {
          audioInstance.pause();
          audioInstance.removeAttribute('src');
          audioInstance.load();
        } catch (e) {
          console.warn('[BeatSync Audio] Error tearing down audio instance:', e);
        }
      }

      audioInstance = new Audio();
      audioInstance.preload = 'metadata';
      audioInstance.volume = get().volume || 0.8;
      (window as unknown as { __audioInstance?: HTMLAudioElement }).__audioInstance = audioInstance;

      setupAudioListeners(audioInstance, set, get);

      set({
        isPlaying: false,
        isLoadingStream: false,
        currentTime: 0,
        toastMessage: null,
      });

      toast.success('Audio player reloaded', { id: 'player-reload' });
    },
  };
});

/**
 * Global helper to restart the audio singleton
 */
export const reloadAudioSingleton = () => {
  if (typeof window === 'undefined') return;
  useAudioStore.getState().restartAudio();
};

if (typeof window !== 'undefined') {
  (window as unknown as { __useAudioStore?: typeof useAudioStore }).__useAudioStore = useAudioStore;
}
