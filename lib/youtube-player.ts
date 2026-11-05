/**
 * BeatSync YouTube IFrame Player Bridge
 * 
 * Manages an invisible client-side YouTube IFrame player that streams
 * real YouTube audio directly inside the user's browser (residential IP),
 * bypassing Vercel serverless datacenter blocks and bot challenges.
 */

import { toast } from "sonner";
import { useAudioStore } from "@/stores/useAudioStore";
import { Track } from "@/types/track";

declare global {
  interface Window {
    YT: typeof YT;
    onYouTubeIframeAPIReady: () => void;
  }
}

class YouTubePlayerService {
  private player: YT.Player | null = null;
  private isReady = false;
  private isScriptLoading = false;
  private pendingVideoId: string | null = null;
  private pendingSeekTime: number | null = null;
  private tickerInterval: NodeJS.Timeout | null = null;
  private currentVideoId: string | null = null;

  /**
   * Check if a given track should be streamed via YouTube IFrame player.
   * Tracks with valid YouTube IDs (11 chars) or /api/stream routes default to YouTube streaming.
   */
  public isYouTubeTrack(track: Track | null | undefined): boolean {
    if (!track || !track.id) return false;
    // Local mock tracks have ids like '1', '2' and /audio/... URLs
    if (track.audio_url && track.audio_url.startsWith("/audio/")) {
      return false;
    }
    // Standard YouTube Video IDs are 11 chars, or audio_url is routed through /api/stream
    if (
      track.audio_url?.includes("/api/stream") ||
      track.id.length === 11 ||
      /^[a-zA-Z0-9_-]{11}$/.test(track.id)
    ) {
      return true;
    }
    return false;
  }

  /**
   * Initialize the YouTube IFrame API script and attach to DOM container.
   */
  public initPlayer(containerId = "beatsync-yt-iframe"): void {
    if (typeof window === "undefined") return;

    if (this.player) return;

    if (window.YT && window.YT.Player) {
      this.createPlayer(containerId);
      return;
    }

    if (this.isScriptLoading) return;
    this.isScriptLoading = true;

    // Listen for the global callback
    const prevCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof prevCallback === "function") {
        try {
          prevCallback();
        } catch (e) {
          console.warn("[BeatSync YT] Previous callback error:", e);
        }
      }
      this.createPlayer(containerId);
    };

    // Inject iframe API script if not already present
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      tag.async = true;
      document.head.appendChild(tag);
    }
  }

  private createPlayer(containerId: string): void {
    if (typeof window === "undefined" || !window.YT || !window.YT.Player) return;

    const el = document.getElementById(containerId);
    if (!el) {
      console.warn(`[BeatSync YT] Container #${containerId} not found in DOM yet.`);
      return;
    }

    try {
      this.player = new window.YT.Player(containerId, {
        height: "200",
        width: "200",
        host: "https://www.youtube-nocookie.com",
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          enablejsapi: 1,
          origin: typeof window !== "undefined" ? window.location.origin : "",
        },
        events: {
          onReady: () => {
            this.isReady = true;
            console.log("[BeatSync YT] YouTube Player initialized and ready.");

            // Set initial volume from store
            const store = useAudioStore.getState();
            if (this.player && typeof this.player.setVolume === "function") {
              this.player.setVolume(Math.round((store.volume ?? 0.8) * 100));
            }

            // Play pending video if requested prior to ready
            if (this.pendingVideoId) {
              const vid = this.pendingVideoId;
              const seekSec = this.pendingSeekTime;
              this.pendingVideoId = null;
              this.pendingSeekTime = null;
              this.loadAndPlay(vid, seekSec || 0);
            }
          },
          onStateChange: (event: YT.OnStateChangeEvent) => {
            this.handleStateChange(event.data);
          },
          onError: (event: YT.OnErrorEvent) => {
            this.handleError(event.data);
          },
        },
      });
    } catch (err) {
      console.error("[BeatSync YT] Failed to instantiate YT.Player:", err);
    }
  }

  private handleStateChange(state: number): void {
    const store = useAudioStore.getState();

    switch (state) {
      case window.YT.PlayerState.PLAYING: {
        const duration = this.player?.getDuration?.() || store.duration;
        useAudioStore.setState({
          isPlaying: true,
          isLoadingStream: false,
          duration: duration > 0 ? duration : store.duration,
        });
        this.startTicker();
        break;
      }

      case window.YT.PlayerState.PAUSED: {
        useAudioStore.setState({ isPlaying: false });
        this.stopTicker();
        break;
      }

      case window.YT.PlayerState.BUFFERING: {
        useAudioStore.setState({ isLoadingStream: true });
        break;
      }

      case window.YT.PlayerState.ENDED: {
        this.stopTicker();
        useAudioStore.setState({ isPlaying: false, currentTime: 0 });
        console.log("[BeatSync YT] Song ended naturally. Playing next track in queue...");
        store.playNext();
        break;
      }

      default:
        break;
    }
  }

  private handleError(code: number): void {
    console.warn("[BeatSync YT] Player error code:", code);
    this.stopTicker();

    let message = "Unable to stream this track. Skipping to next...";
    if (code === 101 || code === 150) {
      message = "Playback restricted by content owner. Skipping to next...";
    } else if (code === 100) {
      message = "Track not found or removed. Skipping to next...";
    }

    toast.error(message, { id: "yt-stream-error" });
    useAudioStore.setState({ isPlaying: false, isLoadingStream: false });

    // Automatically skip to next song in the queue
    setTimeout(() => {
      useAudioStore.getState().playNext();
    }, 1200);
  }

  private startTicker(): void {
    this.stopTicker();
    this.tickerInterval = setInterval(() => {
      if (this.player && typeof this.player.getCurrentTime === "function") {
        try {
          const currentTime = this.player.getCurrentTime();
          const duration = this.player.getDuration();
          const currentStore = useAudioStore.getState();

          if (Number.isFinite(currentTime)) {
            useAudioStore.setState({
              currentTime,
              duration: duration > 0 ? duration : currentStore.duration,
            });

            // Update MediaSession position if supported
            if (
              typeof window !== "undefined" &&
              "mediaSession" in navigator &&
              "setPositionState" in navigator.mediaSession &&
              duration > 0
            ) {
              try {
                navigator.mediaSession.setPositionState({
                  duration: Math.max(0, duration),
                  playbackRate: 1,
                  position: Math.max(0, Math.min(currentTime, duration)),
                });
              } catch {
                // Ignore platform mismatch
              }
            }
          }
        } catch (e) {
          console.warn("[BeatSync YT] Error during time ticker:", e);
        }
      }
    }, 250);
  }

  private stopTicker(): void {
    if (this.tickerInterval) {
      clearInterval(this.tickerInterval);
      this.tickerInterval = null;
    }
  }

  /**
   * Load and play a YouTube video by ID
   */
  public loadAndPlay(videoId: string, startSeconds = 0): void {
    this.currentVideoId = videoId;

    if (!this.isReady || !this.player || typeof this.player.loadVideoById !== "function") {
      this.pendingVideoId = videoId;
      this.pendingSeekTime = startSeconds;
      useAudioStore.setState({ isLoadingStream: true });
      return;
    }

    useAudioStore.setState({ isLoadingStream: true });
    try {
      this.player.loadVideoById({
        videoId,
        startSeconds,
      });

      // Synchronously set volume according to current store
      const vol = useAudioStore.getState().volume ?? 0.8;
      this.player.setVolume(Math.round(vol * 100));
    } catch (err) {
      console.error("[BeatSync YT] Error calling loadVideoById:", err);
      this.handleError(5);
    }
  }

  public play(): void {
    if (this.player && typeof this.player.playVideo === "function") {
      try {
        this.player.playVideo();
      } catch (err) {
        console.warn("[BeatSync YT] Error calling playVideo:", err);
      }
    }
  }

  public pause(): void {
    if (this.player && typeof this.player.pauseVideo === "function") {
      try {
        this.player.pauseVideo();
      } catch (err) {
        console.warn("[BeatSync YT] Error calling pauseVideo:", err);
      }
    }
    this.stopTicker();
  }

  public stop(): void {
    if (this.player && typeof this.player.stopVideo === "function") {
      try {
        this.player.stopVideo();
      } catch (err) {
        console.warn("[BeatSync YT] Error calling stopVideo:", err);
      }
    }
    this.stopTicker();
    this.currentVideoId = null;
  }

  public seekTo(seconds: number): void {
    if (this.player && typeof this.player.seekTo === "function") {
      try {
        this.player.seekTo(seconds, true);
        useAudioStore.setState({ currentTime: seconds });
      } catch (err) {
        console.warn("[BeatSync YT] Error calling seekTo:", err);
      }
    }
  }

  public setVolume(volume: number): void {
    if (this.player && typeof this.player.setVolume === "function") {
      try {
        const clamped = Math.max(0, Math.min(100, Math.round(volume * 100)));
        this.player.setVolume(clamped);
      } catch (err) {
        console.warn("[BeatSync YT] Error calling setVolume:", err);
      }
    }
  }

  public getCurrentVideoId(): string | null {
    return this.currentVideoId;
  }
}

export const ytPlayerService = new YouTubePlayerService();
