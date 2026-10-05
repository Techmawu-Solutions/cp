"use client";

import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import { ArrowDown, Captions, CheckCircle2, ExternalLink, Gauge, Lightbulb, Maximize, Minimize, Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { InteractionCard, type SubmitResult } from "@/components/interactive-video/interaction-card";
import { VideoSurface, useMinWidth } from "@/components/interactive-video/video-surface";
import { VideoTimeline, type TimelineMarker } from "@/components/interactive-video/video-timeline";
import { canAttempt, conceptsToReview, fmtTime, interactionStatus, responseProblem, scoreResponse, sortInteractions, summarize, type InteractionState } from "@/lib/interactive-video/engine";
import { InteractionController, type PlayerEngine } from "@/lib/interactive-video/player";
import { markEncountered, saveVideoProgress, skipInteraction, submitAttempt } from "@/lib/interactive-video/actions";
import { useStore } from "@/lib/store";
import type { ID, VideoAsset, VideoInteraction, VideoInteractionAttempt, VideoInteractionSet } from "@/lib/types";
import { cn } from "@/lib/utils";

const MARKER_STATE: Record<InteractionState, TimelineMarker["state"]> = { open: "open", skipped: "skipped", retry: "incorrect", correct: "correct", incorrect: "incorrect", answered: "answered" };

/** The published questions for a lesson, if it has any. */
export function usePublishedInteractiveVideo(contentId: ID) {
  const sets = useStore((s) => s.videoInteractionSets);
  const assets = useStore((s) => s.videoAssets);
  const all = useStore((s) => s.videoInteractions);
  const set = sets.find((s) => s.contentId === contentId && s.status === "published");
  const asset = set && assets.find((v) => v.id === set.videoId);
  if (!set || !asset) return null;
  return { set, asset, interactions: sortInteractions(all.filter((i) => i.setId === set.id)) };
}

/**
 * Interactive video player (spec section 26.3). Plays the lesson's video and
 * stops at each question; required ones must be answered before the student
 * can go past them. With a `studentId` answers and progress are recorded
 * (scored by the platform); without one it's a preview that records nothing.
 */
export function InteractiveVideoPlayer({
  asset,
  set,
  interactions,
  studentId,
  protect,
  watermark,
  onDuration,
  className,
}: {
  asset: VideoAsset;
  set: Pick<VideoInteractionSet, "id" | "preventSkipping" | "completionPercent">;
  interactions: VideoInteraction[];
  studentId?: ID;
  protect?: boolean;
  watermark?: string;
  onDuration?: (seconds: number) => void;
  className?: string;
}) {
  const record = !!studentId;
  const storeAttempts = useStore((s) => s.videoAttempts);
  const storeProgress = useStore((s) => s.videoProgress);
  const events = useStore((s) => s.learningEvents);
  const [previewAttempts, setPreviewAttempts] = useState<VideoInteractionAttempt[]>([]);
  const [previewSkipped, setPreviewSkipped] = useState<ID[]>([]);
  const attempts = record ? storeAttempts.filter((a) => a.setId === set.id && a.studentId === studentId) : previewAttempts;
  const progress = record ? (storeProgress.find((p) => p.setId === set.id && p.studentId === studentId) ?? null) : null;
  const skipped = record ? (progress?.skipped ?? []) : previewSkipped;
  const sorted = sortInteractions(interactions);

  const [startAt] = useState(() => (progress && progress.status !== "completed" && progress.lastPosition > 3 && progress.lastPosition < asset.durationSeconds - 3 ? progress.lastPosition : 0));
  const [resumeChip, setResumeChip] = useState(startAt > 0);
  const [engine, setEngine] = useState<PlayerEngine | null>(null);
  const [duration, setDuration] = useState(asset.durationSeconds);
  const [time, setTime] = useState(startAt);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<VideoInteraction | null>(null);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [rate, setRate] = useState(1);
  const [captions, setCaptions] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const ctrl = useRef<InteractionController | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const playBtn = useRef<HTMLButtonElement>(null);
  const wide = useMinWidth(640);
  const onEngine = useCallback((e: PlayerEngine | null) => setEngine(e), []);

  const isResolved = useEffectEvent((id: ID) => attempts.some((a) => a.interactionId === id));
  const onShow = useEffectEvent((i: VideoInteraction) => {
    setActive(i);
    if (studentId) markEncountered(i.id, studentId);
  });
  const persist = useEffectEvent((sample: Parameters<typeof saveVideoProgress>[2]) => {
    if (studentId) saveVideoProgress(set.id, studentId, sample);
  });
  const settings = useEffectEvent(() => ({ list: sorted, preventSkipping: set.preventSkipping }));
  const reportDuration = useEffectEvent((d: number) => onDuration?.(d));

  useEffect(() => {
    if (!engine) return;
    const s = settings();
    const c = new InteractionController(engine, { interactions: s.list, preventSkipping: s.preventSkipping, isResolved: (id) => isResolved(id), onShow: (i) => onShow(i), onBlocked: () => toast.info("Answer this question to move on.", { id: "iv-blocked" }), persist: (x) => persist(x) }, startAt);
    ctrl.current = c;
    const off = engine.subscribe((e) => {
      if (e.type === "ready") {
        if (e.duration > 0) {
          setDuration(e.duration);
          reportDuration(e.duration);
        }
        if (startAt > 0 && Math.abs(engine.currentTime() - startAt) > 1) engine.seek(startAt);
      } else if (e.type === "time") {
        c.tick(e.time);
        setTime(Math.round(e.time * 4) / 4);
      } else if (e.type === "play") setPlaying(true);
      else if (e.type === "pause") {
        setPlaying(false);
        c.paused();
      } else if (e.type === "ended") {
        setPlaying(false);
        c.ended();
      } else if (e.type === "error") setError(e.message);
    });
    // Leaving the page or switching tabs saves where the student is.
    const save = () => c.flush();
    const hidden = () => document.visibilityState === "hidden" && c.flush();
    window.addEventListener("pagehide", save);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      c.flush();
      off();
      window.removeEventListener("pagehide", save);
      document.removeEventListener("visibilitychange", hidden);
      ctrl.current = null;
    };
  }, [engine, startAt]);

  // The editor's preview passes edited questions in; the controller keeps its place.
  useEffect(() => {
    ctrl.current?.setInteractions(sorted);
  });

  useEffect(() => {
    const on = () => setFullscreen(document.fullscreenElement === box.current);
    document.addEventListener("fullscreenchange", on);
    return () => document.removeEventListener("fullscreenchange", on);
  }, []);

  const blocking = !!active?.pauseVideo;
  const togglePlay = () => {
    if (!engine || blocking) return;
    setResumeChip(false);
    if (engine.paused()) engine.play();
    else engine.pause();
  };
  const seek = (t: number) => {
    setResumeChip(false);
    ctrl.current?.requestSeek(t);
    setTime(t);
  };
  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void box.current?.requestFullscreen?.().catch(() => {});
  };

  const statusOf = (i: VideoInteraction) => interactionStatus(i, attempts, skipped.includes(i.id));
  const submit = async (i: VideoInteraction, response: { optionIds?: ID[]; text?: string }, clientAttemptId: string): Promise<SubmitResult> => {
    if (typeof navigator !== "undefined" && navigator.onLine === false) return { ok: false, error: "You're offline, so your answer wasn't saved. Check your connection and send it again.", retryable: true };
    let attempt: VideoInteractionAttempt;
    let mine: VideoInteractionAttempt[];
    if (record) {
      const r = submitAttempt({ interactionId: i.id, studentId: studentId!, response, clientAttemptId, videoSeconds: engine?.currentTime(), startedAt: shownAt.current ?? undefined });
      if (!r.ok) return { ok: false, error: r.error };
      attempt = r.value;
      mine = useStore.getState().videoAttempts.filter((a) => a.interactionId === i.id && a.studentId === studentId);
    } else {
      // Preview: the same rules, kept in memory.
      const prior = previewAttempts.filter((a) => a.interactionId === i.id);
      const again = prior.find((a) => a.clientAttemptId === clientAttemptId);
      const blocked = again ? null : (canAttempt(i, interactionStatus(i, prior)) ?? responseProblem(i, response));
      if (blocked) return { ok: false, error: blocked };
      const s = scoreResponse(i, response);
      attempt = again ?? { id: `preview-${clientAttemptId}`, schoolId: "", setId: set.id, interactionId: i.id, studentId: "preview", attemptNumber: prior.length + 1, clientAttemptId, response, correct: s.correct, pointsEarned: s.pointsEarned, pointsPossible: i.points, review: s.review, submittedAt: new Date().toISOString() };
      mine = again ? prior : [...prior, attempt];
      if (!again) setPreviewAttempts((p) => [...p, attempt]);
    }
    const status = interactionStatus(i, mine);
    if (i.resumeAfterSubmit && status.state !== "retry") setTimeout(() => close(i.id), i.showFeedback ? 1600 : 300);
    return { ok: true, attempt, status };
  };
  const shownAt = useRef<string | null>(null);
  useEffect(() => {
    shownAt.current = active ? new Date().toISOString() : null;
  }, [active]);
  const close = (id?: ID) => {
    if (id && ctrl.current?.active?.id !== id) return;
    ctrl.current?.dismiss({ resume: true });
    setActive(ctrl.current?.active ?? null);
    if (!ctrl.current?.active) setTimeout(() => playBtn.current?.focus());
  };
  const skip = (i: VideoInteraction) => {
    if (record) {
      const r = skipInteraction(i.id, studentId!);
      if (!r.ok) return void toast.error(r.error);
    } else setPreviewSkipped((s) => [...s, i.id]);
    close();
  };

  const markers: TimelineMarker[] = sorted.map((i, n) => ({ id: i.id, time: i.timestamp, label: `Question ${n + 1}`, required: i.required, state: MARKER_STATE[statusOf(i).state] }));
  const summary = summarize(sorted, attempts, record ? progress : { encountered: [], skipped, completionPercent: 0 });
  const review = record ? conceptsToReview(events, studentId!) : [];
  const card = active && (
    <InteractionCard
      key={active.id}
      interaction={active}
      status={statusOf(active)}
      index={sorted.findIndex((x) => x.id === active.id)}
      total={sorted.length}
      preview={!record}
      onSubmit={(r, id) => submit(active, r, id)}
      onContinue={() => close()}
      onSkip={active.required ? undefined : () => skip(active)}
    />
  );
  const position = active?.displayPosition ?? "center";

  return (
    <div className={cn("space-y-2", className)}>
      <div
        ref={box}
        className={cn("group/player relative flex flex-col overflow-hidden rounded-xl bg-black text-white", fullscreen && "h-full overflow-y-auto rounded-none")}
        onKeyDown={(e) => {
          const tag = (e.target as HTMLElement).tagName;
          if (tag === "INPUT" || tag === "TEXTAREA" || e.metaKey || e.ctrlKey || e.altKey) return;
          const k = e.key.toLowerCase();
          if (k === " " || k === "k") {
            if ((e.target as HTMLElement).closest("button,[role=slider]") && k === " ") return;
            e.preventDefault();
            togglePlay();
          } else if (k === "arrowright" || k === "arrowleft") {
            if ((e.target as HTMLElement).closest("[role=slider]")) return;
            e.preventDefault();
            seek(Math.max(0, Math.min(duration, time + (k === "arrowright" ? 5 : -5))));
          } else if (k === "m") {
            setMuted((m) => (engine?.setMuted(!m), !m));
          } else if (k === "f") toggleFullscreen();
          else if (k === "c") setCaptions((c) => (engine?.setCaptions?.(!c), !c));
        }}
      >
        <div className={cn("relative w-full", fullscreen ? "min-h-0 flex-1" : "aspect-video")}>
          <VideoSurface asset={asset} startAt={startAt} onEngine={onEngine} protect={protect} />
          {/* Clicks on the picture play / pause here, so an embedded provider's own controls can't be used to skip. */}
          <button type="button" tabIndex={-1} aria-hidden className="absolute inset-0 z-10 cursor-pointer" onClick={togglePlay} />
          {watermark && (
            <span className="pointer-events-none absolute top-3 right-3 z-10 text-xs font-medium text-white/30 select-none" data-no-translate>
              {watermark}
            </span>
          )}
          {!playing && !active && !error && (
            <span className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
              <span className="flex size-16 items-center justify-center rounded-full bg-black/55 ring-1 ring-white/30 transition group-hover/player:scale-105">
                <Play className="size-7 translate-x-0.5 fill-white" />
              </span>
            </span>
          )}
          {resumeChip && !active && (
            <div className="absolute top-3 left-3 z-20 flex items-center gap-2 rounded-full bg-black/70 py-1 pr-1 pl-3 text-xs">
              Resuming from {fmtTime(startAt)}
              <Button size="xs" variant="secondary" onClick={() => (seek(0), setResumeChip(false))}>
                <RotateCcw /> Start over
              </Button>
            </div>
          )}
          {error && (
            <div role="alert" className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-black/85 p-6 text-center text-sm">
              <p>{error}</p>
              {asset.provider !== "file" && (
                <a href={asset.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 underline">
                  Watch on the provider&apos;s site <ExternalLink className="size-3.5" />
                </a>
              )}
            </div>
          )}
          {active && wide && (
            <div className={cn("absolute inset-0 z-20 flex overflow-y-auto p-3 sm:p-5", position === "center" && "items-center justify-center", position === "bottom" && "items-end justify-center", position === "side" && "items-stretch justify-end", blocking ? "bg-black/55" : "pointer-events-none")}>
              <div className={cn("pointer-events-auto my-auto w-full text-foreground", position === "side" ? "max-w-sm" : "max-w-lg")}>{card}</div>
            </div>
          )}
          {active && !wide && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center bg-gradient-to-t from-black/70 p-2 text-xs font-medium">
              <span className="flex items-center gap-1">
                <ArrowDown className="size-3.5" /> Answer the question below to continue
              </span>
            </div>
          )}
        </div>

        {/* Controls stay visible below the picture; questions never cover them. */}
        <div className="relative z-20 bg-neutral-950 px-3 pt-1 pb-2">
          <VideoTimeline duration={duration} time={time} watched={progress?.watchedRanges} markers={markers} onSeek={seek} dark />
          <div className="flex items-center gap-1">
            <Button ref={playBtn} size="icon-sm" variant="ghost" className="text-white hover:bg-white/15 hover:text-white" onClick={togglePlay} disabled={!engine || blocking} aria-label={playing ? "Pause" : "Play"}>
              {playing ? <Pause className="fill-white" /> : <Play className="fill-white" />}
            </Button>
            <span className="px-1 text-xs tabular-nums text-white/85" aria-live="off">
              {fmtTime(time)} / {fmtTime(duration)}
            </span>
            <div className="flex-1" />
            <Button size="icon-sm" variant="ghost" className="text-white hover:bg-white/15 hover:text-white" onClick={() => setMuted((m) => (engine?.setMuted(!m), !m))} aria-label={muted ? "Unmute" : "Mute"} aria-pressed={muted}>
              {muted || volume === 0 ? <VolumeX /> : <Volume2 />}
            </Button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={(e) => {
                const v = Number(e.target.value);
                setVolume(v);
                setMuted(v === 0);
                engine?.setVolume(v);
                engine?.setMuted(v === 0);
              }}
              aria-label="Volume"
              className="hidden w-20 accent-white sm:block"
            />
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-white hover:bg-white/15 hover:text-white" aria-label="Playback speed" />}>
                <Gauge /> {rate}×
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {(engine?.capabilities.rates ?? [1]).map((r) => (
                  <DropdownMenuItem key={r} onClick={() => (setRate(r), engine?.setRate(r))}>
                    {r === rate && <CheckCircle2 />} {r}×
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="icon-sm" variant="ghost" className={cn("text-white hover:bg-white/15 hover:text-white", captions && "bg-white/20")} onClick={() => setCaptions((c) => (engine?.setCaptions?.(!c), !c))} disabled={!engine?.capabilities.captions || (asset.provider === "file" && !asset.captions?.length)} aria-label="Captions" aria-pressed={captions}>
              <Captions />
            </Button>
            <Button size="icon-sm" variant="ghost" className="text-white hover:bg-white/15 hover:text-white" onClick={toggleFullscreen} aria-label={fullscreen ? "Exit full screen" : "Full screen"}>
              {fullscreen ? <Minimize /> : <Maximize />}
            </Button>
          </div>
        </div>

        {active && !wide && <div className="bg-background p-2 text-foreground">{card}</div>}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground" aria-live="polite">
        {!record && <span className="rounded bg-amber-500/15 px-1.5 py-0.5 font-medium text-amber-800 dark:text-amber-300">Preview — answers aren&apos;t recorded</span>}
        <span>
          {summary.completed} of {summary.total} questions answered
        </span>
        {summary.maxScore > 0 && (
          <span>
            Score {summary.score}/{summary.maxScore}
            {summary.scorePercent != null && ` (${Math.round(summary.scorePercent)}%)`}
          </span>
        )}
        {record && <span>Watched {Math.round(progress?.completionPercent ?? 0)}%</span>}
        {summary.pendingReview > 0 && <span>{summary.pendingReview === 1 ? "1 answer waiting for your teacher" : `${summary.pendingReview} answers waiting for your teacher`}</span>}
        {set.preventSkipping && sorted.some((i) => i.required) && <span>Required questions must be answered before you can skip ahead.</span>}
      </div>

      {record && progress?.status === "completed" && (
        <div className="flex items-start gap-3 rounded-xl border bg-emerald-500/8 p-3 text-sm">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
          <div>
            <p className="font-medium">You&apos;ve completed this video.</p>
            {review.length > 0 && (
              <p className="mt-1 flex items-start gap-1.5 text-muted-foreground">
                <Lightbulb className="mt-0.5 size-4 shrink-0 text-amber-500" />
                <span>
                  Worth reviewing: <span data-no-translate>{review.map((r) => r.concept).join(", ")}</span>
                </span>
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
