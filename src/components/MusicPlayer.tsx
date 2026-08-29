"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PLAYLIST } from "@/lib/playlist";

// ===============================================================
// SVG ICONS
// Custom paths: hand-tuned for the 16x16 viewBox, monochrome so
// they take the current text colour and stay crisp on the nav bar.
// ===============================================================

function IconNote({ size = 13 }: { size?: number }) {
  // Eighth note glyph with a flag - more legible than the unicode
  // character at 13px size, and consistent across systems.
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M11 2 L11 10" />
      <path d="M11 2 L5.5 4 L5.5 12" />
      <circle cx="4.25" cy="12" r="1.75" fill="currentColor" stroke="none" />
      <circle cx="9.75" cy="10" r="1.75" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconPlay({ size = 11 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden
    >
      <path d="M4 2.5 L4 13.5 L13 8 Z" />
    </svg>
  );
}

function IconPause({ size = 11 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden
    >
      <rect x="3.5" y="2.5" width="3" height="11" />
      <rect x="9.5" y="2.5" width="3" height="11" />
    </svg>
  );
}

function IconPrev({ size = 12 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden
    >
      <rect x="2.5" y="2.5" width="2" height="11" />
      <path d="M13.5 2.5 L13.5 13.5 L5 8 Z" />
    </svg>
  );
}

function IconNext({ size = 12 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden
    >
      <rect x="11.5" y="2.5" width="2" height="11" />
      <path d="M2.5 2.5 L2.5 13.5 L11 8 Z" />
    </svg>
  );
}

// ===============================================================
// DRAG HOOK
// Lets a user grab a value bar and drag instead of having to
// blindly click-and-release. ref points at the bar DOM node so we
// can compute x ratios at any pointer move.
// ===============================================================

function useDragHandler(
  ref: React.RefObject<HTMLElement>,
  onMove: (pct: number) => void
) {
  return useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      // Initiate a click-to-set immediately on press, so single taps
      // still work without dragging.
      const apply = (clientX: number) => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const pct = Math.max(
          0,
          Math.min(1, (clientX - r.left) / r.width)
        );
        onMove(pct);
      };

      apply(e.clientX);

      // While the pointer is held down, follow it. Capture the
      // pointer so we keep getting moves even if the cursor slips
      // off the bar.
      const target = e.currentTarget;
      target.setPointerCapture(e.pointerId);
      e.preventDefault();

      const onUp = () => {
        target.releasePointerCapture(e.pointerId);
        window.removeEventListener("pointermove", onMoveWin);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
      };
      const onMoveWin = (ev: PointerEvent) => apply(ev.clientX);

      window.addEventListener("pointermove", onMoveWin);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    [ref, onMove]
  );
}


/**
 * Inline nav-bar music trigger + dropdown popover.
 *
 * Trigger lives inside the header nav, on the right tail after the
 * three text links. It is a tiny pill (28x28) showing either `♫` or
 * `♪` depending on play state - nothing else, so it never crowds
 * the nav links.
 *
 * Click the trigger to open a popover that hangs below the nav.
 * The popover carries the actual player: track title, prev / play /
 * next, clickable progress bar, clickable volume bar, close.
 *
 * Click outside or press Escape to dismiss. Re-clicking the trigger
 * toggles. Persists idx + volume + playing + time across reloads so
 * a refresh resumes mid-track.
 *
 * Errors stay silent. Auto-advance to next track on `ended`.
 */

const STORAGE_KEY = "kyon:music:state";

interface PlayerState {
  idx: number;
  volume: number;
  playing: boolean;
  time: number;
}

const DEFAULT_STATE: PlayerState = {
  idx: 0,
  volume: 0.5,
  playing: false,
  time: 0,
};

function loadState(): PlayerState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const p = JSON.parse(raw);
    return {
      idx: typeof p.idx === "number" ? p.idx : 0,
      volume: typeof p.volume === "number" ? p.volume : 0.5,
      playing: !!p.playing,
      time: typeof p.time === "number" ? p.time : 0,
    };
  } catch {
    return DEFAULT_STATE;
  }
}

function saveState(s: PlayerState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // silent
  }
}

function formatTime(t: number): string {
  if (!t || isNaN(t)) return "0:00";
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function MusicPlayer() {
  const [state, setState] = useState<PlayerState>(loadState);
  const [open, setOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);
  const volumeBarRef = useRef<HTMLDivElement | null>(null);

  const track = PLAYLIST[state.idx] || PLAYLIST[0];

  // 若播放列表为空，整个按钮隐藏。
  if (PLAYLIST.length === 0) return null;

  // Audio element bootstrap.
  useEffect(() => {
    const audio = new Audio();
    audio.volume = state.volume;
    audioRef.current = audio;

    const onMeta = () => {
      if (!isNaN(audio.duration)) setDuration(audio.duration);
    };
    const onEnd = () => {
      setState((p) => ({ ...p, idx: (p.idx + 1) % PLAYLIST.length, time: 0 }));
      setCurrentTime(0);
    };
    const onErr = () => setError(true);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("ended", onEnd);
    audio.addEventListener("error", onErr);

    return () => {
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("ended", onEnd);
      audio.removeEventListener("error", onErr);
      audio.pause();
      audio.src = "";
      audioRef.current = null;
    };
    // state.volume is the only field used at bootstrap time.
  }, []);

  // idx -> src.
  useEffect(() => {
    if (!audioRef.current) return;
    const t = PLAYLIST[state.idx];
    if (!t) return;
    setError(false);
    audioRef.current.src = t.src;
    if (audioRef.current.readyState > 0 && !isNaN(audioRef.current.duration)) {
      setDuration(audioRef.current.duration);
    }
    audioRef.current.currentTime = state.time;
    if (state.playing) {
      audioRef.current.play().catch(() => {});
    }
  }, [state.idx]);

  // volume -> element.
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = state.volume;
  }, [state.volume]);

  // playing -> play/pause.
  useEffect(() => {
    if (!audioRef.current) return;
    if (state.playing) {
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current.pause();
    }
  }, [state.playing, state.idx]);

  // RAF tick for the readout.
  // Depends on state.idx so the RAF is cancelled when a new track loads,
  // preventing it from overwriting currentTime with stale time values.
  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (!state.playing) return;
    const tick = () => {
      const a = audioRef.current;
      if (a) setCurrentTime(a.currentTime);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [state.playing, state.idx]);

  // Persistence.
  useEffect(() => {
    saveState({ ...state, time: currentTime });
  }, [state.idx, state.volume, state.playing, currentTime]);

  // Click-outside / Escape.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const root = document.getElementById("music-player-root");
      if (!root) return;
      if (!root.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const togglePlay = useCallback(() => {
    setState((p) => ({ ...p, playing: !p.playing }));
  }, []);

  const prevTrack = useCallback(() => {
    setState((p) => ({
      ...p,
      idx: p.idx <= 0 ? PLAYLIST.length - 1 : p.idx - 1,
      time: 0,
    }));
    setCurrentTime(0);
  }, []);

  const nextTrack = useCallback(() => {
    setState((p) => ({
      ...p,
      idx: (p.idx + 1) % PLAYLIST.length,
      time: 0,
    }));
    setCurrentTime(0);
  }, []);

  const seekTo = useCallback(
    (pct: number) => {
      if (!audioRef.current || !duration) return;
      const t = pct * duration;
      audioRef.current.currentTime = t;
      setCurrentTime(t);
      setState((p) => ({ ...p, time: t }));
    },
    [duration]
  );

  const setVolume = useCallback((v: number) => {
    setState((p) => ({ ...p, volume: Math.max(0, Math.min(1, v)) }));
  }, []);

  // Drag handlers for the progress / volume bars. Single click sets
  // a value; press-and-drag updates as the cursor moves.
  const onProgressDown = useDragHandler(progressBarRef, seekTo);
  const onVolumeDown = useDragHandler(volumeBarRef, setVolume);

  const progressPct = duration ? (currentTime / duration) * 100 : 0;
  const volPct = state.volume * 100;


  return (
    <div
      id="music-player-root"
      className="relative font-mono"
    >
      {/* ============================================================ */}
      {/* TRIGGER - 28x28 pill, lives in the nav                      */}
      {/* ============================================================ */}
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        aria-label={open ? "close music player" : "open music player"}
        aria-expanded={open}
        className={[
          "h-7 w-7 flex items-center justify-center transition-colors text-[13px] leading-none border nav-glow",
          open
            ? "text-primary border-primary/60"
            : "text-foreground/65 border-transparent hover:text-primary hover:border-primary/40",
        ].join(" ")}
      >
        <span aria-hidden>
          <IconNote size={13} />
        </span>
      </button>

      {/* ============================================================ */}
      {/* POPOVER - drops down from the trigger, lives below the nav  */}
      {/* ============================================================ */}
      {open && (
        <div
          role="dialog"
          aria-label="music player"
          className="absolute top-full right-0 mt-2 z-[60] text-[11px]"
          style={{
            width: 280,
            background: "hsl(var(--background) / 0.96)",
            border: "1px solid hsl(var(--primary) / 0.45)",
            backdropFilter: "blur(8px)",
            boxShadow: "0 8px 32px hsl(var(--background) / 0.40)",
          }}
        >
          {/* header */}
          <div
            className="flex items-center justify-between px-3 py-2 text-[10px] uppercase tracking-wider"
            style={{
              borderBottom: "1px solid hsl(var(--primary) / 0.20)",
              color: "hsl(var(--primary) / 0.80)",
            }}
          >
            <span>// music.player</span>
            <span className="text-foreground/35 normal-case tracking-normal tabular-nums">
              {state.idx + 1}/{PLAYLIST.length}
            </span>
          </div>

          {/* track */}
          <div className="px-4 py-3">
            <p
              className="text-foreground/85 truncate"
              style={{ fontSize: 12 }}
              title={track.title}
            >
              {track.title}
            </p>
            <p className="text-foreground/40 truncate text-[10px] mt-0.5">
              {track.artist}
            </p>
            {error && (
              <p className="text-red-400/70 text-[10px] mt-1">
                track failed to load
              </p>
            )}
          </div>

          {/* controls + progress */}
          <div
            className="px-4 pb-3 space-y-2"
            style={{
              borderTop: "1px solid hsl(var(--primary) / 0.10)",
            }}
          >
            {/* row: prev / play / next, centered in the row */}
            <div className="pt-3 flex items-center gap-3 justify-center">
              <button
                type="button"
                onClick={prevTrack}
                aria-label="previous track"
                className="h-7 w-7 flex items-center justify-center text-foreground/60 hover:text-primary transition-colors leading-none"
              >
                <IconPrev size={12} />
              </button>
              <button
                type="button"
                onClick={togglePlay}
                aria-label={state.playing ? "pause" : "play"}
                className="h-7 w-7 flex items-center justify-center text-primary hover:text-glow transition-colors leading-none border border-primary/40 hover:border-primary"
                style={{ minWidth: 28 }}
              >
                {state.playing ? <IconPause size={11} /> : <IconPlay size={11} />}
              </button>
              <button
                type="button"
                onClick={nextTrack}
                aria-label="next track"
                className="h-7 w-7 flex items-center justify-center text-foreground/60 hover:text-primary transition-colors leading-none"
              >
                <IconNext size={12} />
              </button>
            </div>

            {/* row: time stamp, split left/right */}
            <div className="flex items-center justify-between text-foreground/40 tabular-nums text-[10px] px-1">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>

            {/* progress track + thumb */}
            {/*
              padding-left/right = 8px = half thumb width (16px).
              This keeps the thumb centered exactly at the filled bar end
              at 100% progress, with no gap and no overflow.
              thumb x = progressPct% + 2.86%  (2.86 = 8px / 280px * 100)
            */}
            <div
              ref={progressBarRef}
              onPointerDown={onProgressDown}
              className="relative h-8 flex items-center cursor-pointer touch-none"
              style={{ paddingLeft: 8, paddingRight: 8 }}
              aria-label="seek"
              role="slider"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progressPct)}
            >
              {/* track background: solid subtle line */}
              <div
                className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[3px] rounded-full"
                style={{ background: "hsl(var(--foreground) / 0.12)" }}
              />
              {/* filled track: solid primary with glow, no transition */}
              <div
                className="absolute left-0 top-1/2 -translate-y-1/2 h-[3px] rounded-full"
                style={{
                  width: `${progressPct}%`,
                  background: "hsl(var(--primary) / 0.80)",
                  boxShadow: "0 0 6px hsl(var(--primary) / 0.30)",
                }}
              />
              {/* Sonic Orb thumb */}
              <div
                className="absolute top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ left: `calc(${progressPct}% + 2.86%)`, transform: "translate(-50%, -50%)" }}
              >
                {/* pulse ring (CSS animation) */}
                <div className="absolute inset-0 w-5 h-5 -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2 rounded-full pulse-ring" />
                {/* SVG thumb: outer ring + filled core + center dot */}
                <svg width={16} height={16} viewBox="0 0 16 16" className="relative" style={{ filter: "drop-shadow(0 0 5px hsl(var(--primary) / 0.65))" }}>
                  {/* outer ring */}
                  <circle cx="8" cy="8" r="6" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.2" opacity="0.9" />
                  {/* filled core */}
                  <circle cx="8" cy="8" r="3.5" fill="hsl(var(--primary))" />
                  {/* center dot */}
                  <circle cx="8" cy="8" r="1.2" fill="hsl(var(--background))" opacity="0.85" />
                </svg>
              </div>
            </div>

            {/* volume */}
            <div className="flex items-center gap-2">
              <span className="text-foreground/40 text-[10px] uppercase tracking-wider w-6">
                vol
              </span>
              <div
                ref={volumeBarRef}
                onPointerDown={onVolumeDown}
                className="relative flex-1 h-[3px] cursor-pointer touch-none"
                style={{ background: "hsl(var(--foreground) / 0.12)" }}
                aria-label="volume"
                role="slider"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(volPct)}
              >
                <div
                  className="absolute left-0 top-0 h-full"
                  style={{
                    width: `${volPct}%`,
                    background: "hsl(var(--primary) / 0.80)",
                  }}
                />
              </div>
              <span className="text-foreground/40 tabular-nums text-[10px] w-7 text-right">
                {Math.round(volPct)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
