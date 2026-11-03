export interface Track {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration: number; // in seconds
  cover_url: string;
  audio_url: string;
}
