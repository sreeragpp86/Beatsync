import { create } from 'zustand';
import { Track } from '@/types/track';

export interface AudioState {
  // State
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  queue: Track[];
  queueIndex: number;
  isQueueOpen: boolean;

  // Actions
  setQueue: (tracks: Track[], startIndex?: number) => void;
  playTrack: (track: Track) => void;
  playQueueIndex: (index: number) => void;
  playWithAutoQueue: (selectedTrack: Track, allAvailableTracks: Track[]) => void;
  clearQueue: () => void;
  removeFromQueue: (index: number) => void;
  reorderQueue: (fromIndex: number, toIndex: number) => void;
  toggleQueue: () => void;
  setIsQueueOpen: (open: boolean) => void;
  togglePlay: () => void;
  seek: (seconds: number) => void;
  setVolume: (volume: number) => void;
  playNext: () => void;
  playPrevious: () => void;
}

// Client-safe Audio singleton initialization
let audioInstance: HTMLAudioElement | null = null;

const getAudioElement = (): HTMLAudioElement | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  if (!audioInstance) {
    audioInstance = new Audio();
    audioInstance.preload = 'metadata';
    audioInstance.volume = 0.8;
  }

  return audioInstance;
};

export const useAudioStore = create<AudioState>((set, get) => {
  // Initialize listeners on client side
  if (typeof window !== 'undefined') {
    const audio = getAudioElement();

    if (audio) {
      audio.addEventListener('timeupdate', () => {
        set({ currentTime: audio.currentTime });
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
        get().playNext();
      });

      audio.addEventListener('play', () => {
        set({ isPlaying: true });
      });

      audio.addEventListener('pause', () => {
        set({ isPlaying: false });
      });

      audio.addEventListener('error', (e) => {
        console.error('[SoundWave Audio] Error playing audio:', e);
        set({ isPlaying: false });
      });
    }
  }

  return {
    currentTrack: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 0.8,
    queue: [],
    queueIndex: -1,
    isQueueOpen: false,

    toggleQueue: () => set((state) => ({ isQueueOpen: !state.isQueueOpen })),
    setIsQueueOpen: (open: boolean) => set({ isQueueOpen: open }),

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
          currentTime: 0,
          duration: 0,
        });
        return;
      }

      const validIndex = Math.max(0, Math.min(startIndex, tracks.length - 1));
      const targetTrack = tracks[validIndex];

      set({
        queue: tracks,
        queueIndex: validIndex,
      });

      get().playQueueIndex(validIndex);
    },

    playTrack: (track: Track) => {
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
      });

      if (audio) {
        if (audio.src !== track.audio_url) {
          audio.src = track.audio_url;
          audio.currentTime = 0;
          audio.load();
        }

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              set({ isPlaying: true });
            })
            .catch((error) => {
              if (error.name !== 'AbortError') {
                console.warn('[SoundWave Audio] Playback prevented:', error);
              }
              set({ isPlaying: false });
            });
        }
      }
    },

    playQueueIndex: (index: number) => {
      const { queue } = get();
      if (!queue || index < 0 || index >= queue.length) return;

      const targetTrack = queue[index];

      set({
        queueIndex: index,
        currentTrack: targetTrack,
        currentTime: 0,
        duration: targetTrack.duration || 0,
      });

      const audio = getAudioElement();
      if (audio) {
        if (audio.src !== targetTrack.audio_url) {
          audio.src = targetTrack.audio_url;
          audio.currentTime = 0;
          audio.load();
        }

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              set({ isPlaying: true });
            })
            .catch((error) => {
              if (error.name !== 'AbortError') {
                console.warn('[SoundWave Audio] Playback prevented:', error);
              }
              set({ isPlaying: false });
            });
        }
      }
    },

    playWithAutoQueue: (selectedTrack: Track, allAvailableTracks: Track[]) => {
      if (!selectedTrack) return;

      // 1. Filter candidates excluding selectedTrack
      const candidates = (allAvailableTracks || []).filter(
        (t) => t.id !== selectedTrack.id
      );

      // 2. Prioritize tracks sharing artist, genre, or album
      const matching = candidates.filter((t) => {
        const sameArtist =
          t.artist.trim().toLowerCase() === selectedTrack.artist.trim().toLowerCase();
        const sameGenre = Boolean(
          t.genre &&
            selectedTrack.genre &&
            t.genre.trim().toLowerCase() === selectedTrack.genre.trim().toLowerCase()
        );
        const sameAlbum = Boolean(
          t.album &&
            selectedTrack.album &&
            t.album.trim().toLowerCase() === selectedTrack.album.trim().toLowerCase()
        );
        return sameArtist || sameGenre || sameAlbum;
      });

      const nonMatching = candidates.filter((t) => !matching.includes(t));

      // 3. Randomized shuffle of remaining non-matching tracks
      const shuffledNonMatching = [...nonMatching];
      for (let i = shuffledNonMatching.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledNonMatching[i], shuffledNonMatching[j]] = [
          shuffledNonMatching[j],
          shuffledNonMatching[i],
        ];
      }

      const prioritizedPool = [...matching, ...shuffledNonMatching];

      // 4. Target auto-queue length: 10 to 20 tracks
      let generatedQueue: Track[] = [selectedTrack, ...prioritizedPool];

      // Pad queue if catalog is smaller than 10 tracks
      if (generatedQueue.length > 1 && generatedQueue.length < 10) {
        const cyclePool = [...prioritizedPool, selectedTrack];
        let idx = 0;
        while (generatedQueue.length < 12 && cyclePool.length > 0) {
          generatedQueue.push(cyclePool[idx % cyclePool.length]);
          idx++;
        }
      }

      const finalQueue = generatedQueue.slice(0, 20);

      set({
        queue: finalQueue,
        queueIndex: 0,
        currentTrack: selectedTrack,
        currentTime: 0,
        duration: selectedTrack.duration || 0,
      });

      const audio = getAudioElement();
      if (audio) {
        if (audio.src !== selectedTrack.audio_url) {
          audio.src = selectedTrack.audio_url;
          audio.currentTime = 0;
          audio.load();
        }

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => set({ isPlaying: true }))
            .catch((err) => {
              if (err.name !== 'AbortError') {
                console.warn('[SoundWave Audio] Autoplay prevented:', err);
              }
              set({ isPlaying: false });
            });
        }
      }
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
          if (!audio.src || audio.src === '' || audio.src !== currentTrack.audio_url) {
            audio.src = currentTrack.audio_url;
            audio.load();
          }
          const playPromise = audio.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                set({ isPlaying: true });
              })
              .catch((error) => {
                if (error.name !== 'AbortError') {
                  console.warn('[SoundWave Audio] Playback prevented:', error);
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
          console.warn('[SoundWave Audio] Error seeking:', err);
        }
      }

      set({ currentTime: targetTime });
    },

    setVolume: (volume: number) => {
      const audio = getAudioElement();
      const clampedVolume = Math.max(0, Math.min(1, volume));

      if (audio) {
        audio.volume = clampedVolume;
      }

      set({ volume: clampedVolume });
    },

    playNext: () => {
      const { queue, queueIndex } = get();
      if (!queue || queue.length === 0) return;

      const nextIndex = (queueIndex + 1) % queue.length;
      get().playQueueIndex(nextIndex);
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
