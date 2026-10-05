"use client";

import type { PlayerEngine, PlayerEvent } from "@/lib/interactive-video/player";

/**
 * Player adapters (spec section 26.3, "player layer"). Each one turns a video
 * technology into a PlayerEngine; the interaction system only ever sees that
 * interface. Add an adapter here for HLS/DASH streaming or another provider.
 */

type Listener = (e: PlayerEvent) => void;

function emitter() {
  const listeners = new Set<Listener>();
  return {
    emit: (e: PlayerEvent) => listeners.forEach((l) => l(e)),
    subscribe: (cb: Listener) => {
      listeners.add(cb);
      return () => void listeners.delete(cb);
    },
    clear: () => listeners.clear(),
  };
}

const RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];

/** An uploaded file or any URL the browser can play in <video>. */
export function html5Engine(video: HTMLVideoElement): PlayerEngine {
  const bus = emitter();
  let raf = 0;
  // timeupdate fires only ~4 times a second; while playing we also sample each frame (throttled) so pauses land on time.
  let lastEmit = 0;
  const loop = () => {
    const now = performance.now();
    if (now - lastEmit > 100) {
      lastEmit = now;
      bus.emit({ type: "time", time: video.currentTime });
    }
    raf = requestAnimationFrame(loop);
  };
  const on: Record<string, () => void> = {
    loadedmetadata: () => bus.emit({ type: "ready", duration: video.duration }),
    play: () => {
      bus.emit({ type: "play" });
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(loop);
    },
    pause: () => {
      cancelAnimationFrame(raf);
      bus.emit({ type: "pause" });
    },
    ended: () => {
      cancelAnimationFrame(raf);
      bus.emit({ type: "ended" });
    },
    seeked: () => bus.emit({ type: "time", time: video.currentTime }),
    error: () => bus.emit({ type: "error", message: "This video couldn't be loaded." }),
  };
  for (const [k, fn] of Object.entries(on)) video.addEventListener(k, fn);
  if (video.readyState >= 1) queueMicrotask(() => bus.emit({ type: "ready", duration: video.duration }));
  return {
    play: () => void video.play().catch(() => bus.emit({ type: "pause" })),
    pause: () => video.pause(),
    seek: (s) => {
      video.currentTime = s;
    },
    currentTime: () => video.currentTime,
    duration: () => (Number.isFinite(video.duration) ? video.duration : 0),
    paused: () => video.paused,
    setRate: (r) => {
      video.playbackRate = r;
    },
    setVolume: (v) => {
      video.volume = v;
    },
    setMuted: (m) => {
      video.muted = m;
    },
    setCaptions: (show) => {
      for (const t of Array.from(video.textTracks)) t.mode = show && (t.kind === "captions" || t.kind === "subtitles") ? "showing" : "hidden";
    },
    capabilities: { rates: RATES, captions: true, volume: true },
    subscribe: bus.subscribe,
    destroy: () => {
      cancelAnimationFrame(raf);
      for (const [k, fn] of Object.entries(on)) video.removeEventListener(k, fn);
      bus.clear();
    },
  };
}

// ---------------------------------------------------------------------------
// YouTube (IFrame Player API)
// ---------------------------------------------------------------------------

interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(s: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  setPlaybackRate(r: number): void;
  getAvailablePlaybackRates(): number[];
  setVolume(v: number): void;
  mute(): void;
  unMute(): void;
  loadModule(m: string): void;
  unloadModule(m: string): void;
  getIframe(): HTMLIFrameElement;
  destroy(): void;
}
interface YTNamespace {
  Player: new (el: HTMLElement, opts: Record<string, unknown>) => YTPlayer;
  PlayerState: { PLAYING: number; PAUSED: number; ENDED: number; BUFFERING: number };
}
declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let ytApi: Promise<YTNamespace> | null = null;
function loadYouTubeApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  ytApi ??= new Promise((resolve, reject) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve(window.YT!);
    };
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    s.async = true;
    s.onerror = () => {
      ytApi = null;
      reject(new Error("YouTube couldn't be reached."));
    };
    document.head.appendChild(s);
  });
  return ytApi;
}

/**
 * A YouTube video with YouTube's own controls hidden, so seeking goes through
 * our seek bar (and its anti-skip rule). The page's origin is sent as referrer;
 * YouTube refuses to play without it (its "error 153").
 */
export function youtubeEngine(host: HTMLElement, videoId: string, opts: { start?: number } = {}): PlayerEngine {
  const bus = emitter();
  let player: YTPlayer | null = null;
  let ready = false;
  let state = -1;
  let poll = 0;
  let destroyed = false;
  const queued: (() => void)[] = [];
  const whenReady = (fn: () => void) => (ready ? fn() : queued.push(fn));
  const startPoll = () => {
    window.clearInterval(poll);
    poll = window.setInterval(() => player && bus.emit({ type: "time", time: player.getCurrentTime() }), 100);
  };
  const mount = document.createElement("div");
  host.appendChild(mount);
  loadYouTubeApi()
    .then((YT) => {
      if (destroyed) return;
      player = new YT.Player(mount, {
        videoId,
        host: "https://www.youtube-nocookie.com",
        width: "100%",
        height: "100%",
        playerVars: { controls: 0, disablekb: 1, modestbranding: 1, rel: 0, playsinline: 1, iv_load_policy: 3, fs: 0, start: Math.floor(opts.start ?? 0), origin: window.location.origin },
        events: {
          onReady: () => {
            ready = true;
            const frame = player!.getIframe();
            frame.referrerPolicy = "strict-origin-when-cross-origin";
            frame.setAttribute("tabindex", "-1");
            frame.title = "Video";
            bus.emit({ type: "ready", duration: player!.getDuration() });
            queued.splice(0).forEach((fn) => fn());
          },
          onStateChange: (e: { data: number }) => {
            state = e.data;
            if (e.data === YT.PlayerState.PLAYING) {
              bus.emit({ type: "play" });
              startPoll();
            } else if (e.data === YT.PlayerState.PAUSED) {
              window.clearInterval(poll);
              bus.emit({ type: "time", time: player!.getCurrentTime() });
              bus.emit({ type: "pause" });
            } else if (e.data === YT.PlayerState.ENDED) {
              window.clearInterval(poll);
              bus.emit({ type: "ended" });
            }
          },
          onError: (e: { data: number }) => bus.emit({ type: "error", message: e.data === 101 || e.data === 150 ? "The owner of this video doesn't allow it to be played on other sites." : "This YouTube video couldn't be played." }),
        },
      });
    })
    .catch((e: Error) => bus.emit({ type: "error", message: e.message }));
  return {
    play: () => whenReady(() => player!.playVideo()),
    pause: () => whenReady(() => player!.pauseVideo()),
    seek: (s) =>
      whenReady(() => {
        player!.seekTo(s, true);
        bus.emit({ type: "time", time: s });
      }),
    currentTime: () => (ready ? player!.getCurrentTime() : (opts.start ?? 0)),
    duration: () => (ready ? player!.getDuration() : 0),
    paused: () => state !== 1 && state !== 3,
    setRate: (r) => whenReady(() => player!.setPlaybackRate(r)),
    setVolume: (v) => whenReady(() => player!.setVolume(Math.round(v * 100))),
    setMuted: (m) => whenReady(() => (m ? player!.mute() : player!.unMute())),
    setCaptions: (show) => whenReady(() => (show ? player!.loadModule("captions") : player!.unloadModule("captions"))),
    capabilities: { rates: RATES, captions: true, volume: true },
    subscribe: bus.subscribe,
    destroy: () => {
      destroyed = true;
      window.clearInterval(poll);
      bus.clear();
      try {
        player?.destroy();
      } catch {
        /* already gone */
      }
      mount.remove();
    },
  };
}
