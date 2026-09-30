"use client";

import { useEffect, useRef, useState } from "react";
import { Bookmark, Captions, Headphones, Pause, Play, RotateCcw, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ItemQuestion } from "@/components/open/player/practice";
import { itemById } from "@/lib/data/items";
import { addNote, completeActivity, recordAnswer, saveResume } from "@/lib/learning";
import { useOpen } from "@/lib/store";
import type { Activity } from "@/lib/types";
import { cn } from "@/lib/utils";

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

/**
 * A simulated lesson video (no media files in the prototype): the instructor's
 * slides advance with a timed transcript. It exercises the real player
 * features — chapters, captions, speed, transcript search and click-to-seek,
 * resume, audio-only data saver, time-stamped notes and an in-video question
 * (spec section 6.6, FR-VP-1..4).
 */
export function SimVideo({ activity, record }: { activity: Activity; record: boolean }) {
  const lines = activity.transcript ?? [];
  const duration = (lines.at(-1)?.t ?? 0) + 14;
  const saved = useOpen((s) => s.progress[activity.id]);
  const dataSaver = useOpen((s) => !!s.profile?.dataSaver);
  const [t, setT] = useState(() => (saved?.resumeAt && saved.resumeAt < duration - 2 ? saved.resumeAt : 0));
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [captions, setCaptions] = useState(true);
  const [query, setQuery] = useState("");
  const [asking, setAsking] = useState(false);
  const [answered, setAnswered] = useState(false);
  const maxT = useRef(t);
  const doneRef = useRef(!!saved?.done);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setT((cur) => {
        const nt = Math.min(duration, cur + 0.25 * speed);
        maxT.current = Math.max(maxT.current, nt);
        const q = activity.videoQuestion;
        if (q && !answered && cur < q.at && nt >= q.at) {
          setPlaying(false);
          setAsking(true);
          return q.at;
        }
        if (nt >= duration) setPlaying(false);
        return nt;
      });
    }, 250);
    return () => clearInterval(id);
  }, [playing, speed, duration, activity.videoQuestion, answered]);

  // Resume position and completion (≥ 80% watched → Exposed).
  useEffect(() => {
    if (!record) return;
    const pct = Math.round((maxT.current / duration) * 100);
    const id = setTimeout(() => saveResume(activity.id, t, pct), 400);
    if (!doneRef.current && pct >= 80) {
      doneRef.current = true;
      completeActivity(activity, { watchedPct: pct });
      toast.success("Marked as watched — practice will show whether you understood it");
    }
    return () => clearTimeout(id);
  }, [t, record, duration, activity]);

  const lineIdx = Math.max(0, lines.findIndex((l, i) => t >= l.t && (i === lines.length - 1 || t < lines[i + 1]!.t)));
  const chapters = activity.chapters ?? [];
  const chapterIdx = Math.max(0, chapters.findLastIndex((c) => t >= c.t));
  const slide = activity.slides?.[Math.min(chapterIdx, (activity.slides?.length ?? 1) - 1)];
  const q = activity.videoQuestion ? itemById.get(activity.videoQuestion.itemId) : undefined;
  const matches = query.trim() ? lines.filter((l) => l.text.toLowerCase().includes(query.trim().toLowerCase())) : [];

  return (
    <div className="space-y-3">
      <div className="relative aspect-video overflow-hidden rounded-2xl bg-[oklch(0.24_0.03_210)] text-white">
        {dataSaver ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
            <Headphones className="size-8 opacity-80" />
            <p className="font-medium">Audio only · data saver</p>
            <p className="text-sm opacity-80">About 0.4 MB a minute instead of 6 MB. Slides below.</p>
          </div>
        ) : (
          <div className="flex h-full flex-col justify-center p-6 sm:p-10">
            <p className="text-xs tracking-widest uppercase opacity-60">{chapters[chapterIdx]?.title}</p>
            <p className="mt-2 font-heading text-2xl font-semibold sm:text-4xl">{slide?.title}</p>
            <ul className="mt-4 space-y-2 text-base sm:text-lg">
              {slide?.points.map((p) => (
                <li key={p} className="flex gap-2">
                  <span className="text-[oklch(0.8_0.12_185)]">•</span>
                  <span className="font-mono">{p}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {captions && lines[lineIdx] && (t > 0 || playing) && <p className="absolute inset-x-4 bottom-4 mx-auto w-fit max-w-[90%] rounded bg-black/75 px-2 py-1 text-center text-sm">{lines[lineIdx]!.text}</p>}
        {!playing && !asking && (
          <button type="button" onClick={() => {
              if (t >= duration) setT(0);
              setPlaying(true);
            }} className="absolute inset-0 grid place-items-center bg-black/10" aria-label="Play">
            <span className="grid size-16 place-items-center rounded-full bg-white/90 text-[oklch(0.24_0.03_210)]">{t >= duration ? <RotateCcw className="size-7" /> : <Play className="ml-1 size-7" />}</span>
          </button>
        )}
        {asking && q && (
          <div className="absolute inset-0 overflow-y-auto bg-background p-4 text-foreground">
            <p className="mb-2 text-xs font-medium text-primary uppercase">Quick question — the video continues after</p>
            <ItemQuestion
              item={q}
              allowHints={false}
              onDone={(correct) => {
                if (record) recordAnswer(q, correct, "video_question");
                setAnswered(true);
              }}
              doneLabel="Continue the video"
              onContinue={() => (setAsking(false), setPlaying(true))}
            />
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button size="icon-sm" variant="outline" aria-label={playing ? "Pause" : "Play"} onClick={() => setPlaying((p) => !p)} disabled={asking}>
          {playing ? <Pause /> : <Play />}
        </Button>
        <span className="w-24 text-xs text-muted-foreground tabular-nums">
          {fmt(t)} / {fmt(duration)}
        </span>
        <div className="relative min-w-40 flex-1">
          <input type="range" min={0} max={duration} step={0.5} value={t} onChange={(e) => setT(Number(e.target.value))} className="w-full accent-primary" aria-label="Seek" />
          {chapters.map((c) => (
            <span key={c.t} className="pointer-events-none absolute top-0 h-1.5 w-0.5 bg-foreground/40" style={{ left: `${(c.t / duration) * 100}%` }} />
          ))}
        </div>
        <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="h-7 rounded-md border bg-card px-1.5 text-xs" aria-label="Playback speed">
          {SPEEDS.map((sp) => (
            <option key={sp} value={sp}>
              {sp}×
            </option>
          ))}
        </select>
        <Button size="icon-sm" variant={captions ? "secondary" : "ghost"} aria-pressed={captions} aria-label="Captions" onClick={() => setCaptions((c) => !c)}>
          <Captions />
        </Button>
        {record && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              const text = window.prompt(`Note at ${fmt(t)}`);
              if (!text?.trim()) return;
              addNote(activity.id, text.trim(), Math.floor(t));
              toast.success("Note saved");
            }}
          >
            <Bookmark /> Note at {fmt(t)}
          </Button>
        )}
      </div>

      {chapters.length > 1 && (
        <div className="flex flex-wrap gap-1.5" aria-label="Chapters">
          {chapters.map((c, i) => (
            <button key={c.t} type="button" onClick={() => setT(c.t)} className={cn("rounded-full border px-2.5 py-0.5 text-xs", i === chapterIdx ? "border-primary bg-accent" : "bg-card")}>
              {fmt(c.t)} {c.title}
            </button>
          ))}
        </div>
      )}

      <details className="rounded-2xl border bg-card p-3" open>
        <summary className="cursor-pointer text-sm font-medium">Transcript</summary>
        <div className="mt-2 flex items-center gap-2">
          <Search className="size-4 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search in this video" className="h-8" aria-label="Search in this video" />
        </div>
        {query.trim() && <p className="mt-1 text-xs text-muted-foreground">{matches.length} match{matches.length === 1 ? "" : "es"}</p>}
        <ol className="mt-2 max-h-56 space-y-1 overflow-y-auto text-sm">
          {(query.trim() ? matches : lines).map((l) => (
            <li key={l.t}>
              <button type="button" onClick={() => setT(l.t)} className={cn("flex w-full gap-2 rounded px-1.5 py-1 text-left hover:bg-muted", lines[lineIdx] === l && "bg-accent")}>
                <span className="w-10 shrink-0 text-xs text-muted-foreground tabular-nums">{fmt(l.t)}</span>
                <span>{l.text}</span>
              </button>
            </li>
          ))}
        </ol>
      </details>
    </div>
  );
}
