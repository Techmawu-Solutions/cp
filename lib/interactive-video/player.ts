import type { ID, VideoInteraction } from "@/lib/types";
import { crossed, seekBlocker, sortInteractions } from "@/lib/interactive-video/engine";

/**
 * The player layer (spec section 26.3). Interactions never talk to a <video>
 * element or the YouTube API directly: they drive a `PlayerEngine`, and an
 * adapter per technology implements it (components/interactive-video/engines).
 * Moving to HLS streaming or another provider means writing one adapter.
 */
export type PlayerEvent =
  | { type: "ready"; duration: number }
  | { type: "play" }
  | { type: "pause" }
  | { type: "ended" }
  | { type: "time"; time: number }
  | { type: "error"; message: string };

export interface PlayerEngine {
  play(): void;
  pause(): void;
  seek(seconds: number): void;
  currentTime(): number;
  duration(): number;
  paused(): boolean;
  setRate(rate: number): void;
  setVolume(volume: number): void;
  setMuted(muted: boolean): void;
  /** Captions on/off, where the technology supports it. */
  setCaptions?(on: boolean): void;
  readonly capabilities: { rates: number[]; captions: boolean; volume: boolean };
  subscribe(cb: (e: PlayerEvent) => void): () => void;
  destroy(): void;
}

export interface ProgressSample {
  position: number;
  /** Stretches played since the last save. */
  ranges: [number, number][];
  /** Seconds of playback since the last save. */
  watchSeconds: number;
}

export interface ControllerOptions {
  interactions: VideoInteraction[];
  preventSkipping: boolean;
  /** Answered at least once (stored attempts). */
  isResolved: (id: ID) => boolean;
  /** Show this interaction now. */
  onShow: (i: VideoInteraction) => void;
  /** A forward seek was stopped at this required question. */
  onBlocked?: (i: VideoInteraction) => void;
  /** Save progress. Called at most every `saveEverySeconds` of playback, and on flush(). */
  persist?: (sample: ProgressSample) => void;
  saveEverySeconds?: number;
}

/** A jump larger than this between two time updates is a seek, not playback. */
const JUMP = 1.5;

/**
 * Watches playback time locally and decides when questions appear. Nothing
 * here asks the server anything while the video plays: interactions are
 * loaded once, and progress is saved in batches.
 */
export class InteractionController {
  private sorted: VideoInteraction[];
  private last: number;
  private segStart: number | null = null;
  private pendingRanges: [number, number][] = [];
  private pendingWatch = 0;
  private sinceSave = 0;
  /** Optional questions closed in this visit; they come back on the next visit if still unanswered. */
  private dismissed = new Set<ID>();
  active: VideoInteraction | null = null;
  private engine: PlayerEngine;
  private opts: ControllerOptions;

  // Plain fields rather than parameter properties: tests run with Node's type stripping.
  constructor(engine: PlayerEngine, opts: ControllerOptions, startAt = 0) {
    this.engine = engine;
    this.opts = opts;
    this.sorted = sortInteractions(opts.interactions);
    this.last = startAt;
  }

  /** Swap in edited interactions (editor preview) without losing the position. */
  setInteractions(list: VideoInteraction[]) {
    this.sorted = sortInteractions(list);
  }

  private pending = (i: VideoInteraction) => !this.opts.isResolved(i.id) && !this.dismissed.has(i.id);
  private resolvedOrDismissed = (i: VideoInteraction) => this.opts.isResolved(i.id) || this.dismissed.has(i.id);

  private closeSegment(at: number) {
    if (this.segStart != null && at > this.segStart) this.pendingRanges.push([this.segStart, at]);
    this.segStart = null;
  }

  private show(i: VideoInteraction) {
    this.active = i;
    if (i.pauseVideo) {
      this.engine.pause();
      this.engine.seek(i.timestamp);
      this.closeSegment(i.timestamp);
      this.last = i.timestamp;
    }
    this.opts.onShow(i);
  }

  /** Feed every time update from the adapter. */
  tick(t = this.engine.currentTime()) {
    const prev = this.last;
    if (this.active?.pauseVideo) {
      // Something started playback behind the question (a click on an embedded player): put it back.
      if (!this.engine.paused()) this.engine.pause();
      if (Math.abs(t - this.active.timestamp) > 0.5) this.engine.seek(this.active.timestamp);
      return;
    }
    const delta = t - prev;
    if (Math.abs(delta) > JUMP) {
      // A seek we didn't make (keyboard, the provider's own controls): apply the same rule as ours.
      this.closeSegment(prev);
      if (delta > 0) {
        const blocker = seekBlocker(this.sorted, t, this.resolvedOrDismissed, this.opts.preventSkipping);
        if (blocker) {
          this.engine.seek(blocker.timestamp);
          this.last = blocker.timestamp;
          this.opts.onBlocked?.(blocker);
          this.show(blocker);
          return;
        }
      }
      this.last = t;
      return;
    }
    if (delta > 0) {
      if (this.segStart == null) this.segStart = prev;
      this.pendingWatch += delta;
      this.sinceSave += delta;
    }
    this.last = t;
    const due = crossed(this.sorted, prev, t + 1e-6).find(this.pending);
    if (due && !this.active) {
      this.show(due);
      return;
    }
    if (this.sinceSave >= (this.opts.saveEverySeconds ?? 15)) this.flush();
  }

  /** Our own seek bar, markers and keyboard shortcuts come here. */
  requestSeek(target: number) {
    const to = Math.max(0, Math.min(target, this.engine.duration() || target));
    this.closeSegment(this.last);
    if (to > this.last) {
      const blocker = seekBlocker(this.sorted, to, this.resolvedOrDismissed, this.opts.preventSkipping);
      if (blocker) {
        this.engine.seek(blocker.timestamp);
        this.last = blocker.timestamp;
        this.opts.onBlocked?.(blocker);
        this.show(blocker);
        return blocker;
      }
    }
    this.engine.seek(to);
    this.last = to;
    return null;
  }

  /** The video reached its end: questions placed at the very end still appear. */
  ended() {
    const end = this.engine.duration() || this.last;
    this.closeSegment(end);
    const due = crossed(this.sorted, this.last, end + 1).find(this.pending);
    this.last = end;
    if (due && !this.active) this.show({ ...due, pauseVideo: true });
    this.flush();
  }

  paused() {
    this.closeSegment(this.last);
    this.flush();
  }

  /** The overlay closed (answered, skipped or continued). */
  dismiss(opts: { resume: boolean }) {
    const was = this.active;
    if (!was) return;
    this.dismissed.add(was.id);
    this.active = null;
    // Another question at the same moment shows next, before playback resumes.
    const next = this.sorted.find((i) => i.id !== was.id && Math.abs(i.timestamp - was.timestamp) < 1e-6 && this.pending(i));
    if (next) return this.show(next);
    if (opts.resume && was.pauseVideo) this.engine.play();
  }

  /** Save now (pause, end, leaving the page). */
  flush() {
    if (this.segStart != null && this.last > this.segStart) {
      this.pendingRanges.push([this.segStart, this.last]);
      this.segStart = this.last;
    }
    if (!this.opts.persist || (this.pendingRanges.length === 0 && this.pendingWatch === 0)) {
      this.sinceSave = 0;
      return;
    }
    const sample: ProgressSample = { position: this.last, ranges: this.pendingRanges, watchSeconds: Math.round(this.pendingWatch * 10) / 10 };
    this.pendingRanges = [];
    this.pendingWatch = 0;
    this.sinceSave = 0;
    this.opts.persist(sample);
  }

  position() {
    return this.last;
  }
}
