/**
 * Audio playlist for the floating MusicPlayer.
 *
 * Each entry maps to a single playable track. URLs can be either:
 *   - absolute https URLs (CDN, GitHub raw, etc.)
 *   - relative paths starting with `/` (served from /public)
 *
 * The player does NOT validate the URL on mount - if a URL 404s
 * the browser just throws a media error and we silently mark the
 * track as failed in the UI (so users see which track is broken).
 *
 * To replace later: drop your mp3s into /public/audio/ and update
 * the `src` field below. The UI is data-driven; nothing else has
 * to change.
 */
export interface Track {
  title: string;
  artist: string;
  src: string;
}

export const PLAYLIST: Track[] = [
  {
    title: "Do It For The Show",
    artist: "哲",
    src: "/audio/Do It For The Show.mp3",
  },
  {
    title: "Traffic",
    artist: "maryjo",
    src: "/audio/Traffic - maryjo[Traffic].flac",
  },
];
