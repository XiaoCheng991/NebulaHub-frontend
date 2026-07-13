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
  // 暂无音源。将 mp3 放入 /public/audio/ 后在此添加条目。
  // 若列表为空，MusicPlayer 的 trigger 按钮会在 nav 中自动隐藏。
];
