"use client";

import { useRef, useState } from "react";
import { Check, Circle, CircleDot, MessageSquareText, X } from "lucide-react";
import { fmtTime } from "@/lib/interactive-video/engine";
import type { ID } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface TimelineMarker {
  id: ID;
  time: number;
  label: string;
  required: boolean;
  /** What the viewer has done with it; shown with an icon as well as a colour. */
  state?: "open" | "correct" | "incorrect" | "answered" | "skipped";
  problem?: boolean;
}

const ICON = { open: CircleDot, correct: Check, incorrect: X, answered: MessageSquareText, skipped: Circle } as const;
const TONE = {
  open: "bg-white text-slate-900 ring-slate-900/30",
  correct: "bg-emerald-500 text-white ring-emerald-900/30",
  incorrect: "bg-red-500 text-white ring-red-900/30",
  answered: "bg-blue-500 text-white ring-blue-900/30",
  skipped: "bg-slate-300 text-slate-700 ring-slate-900/20",
} as const;

/**
 * Seek bar with interaction markers (spec section 26.3). A slider for the
 * keyboard and screen readers (arrows ±5 s, Home / End); markers are buttons.
 * In the editor markers can be dragged, or moved with the arrow keys (±1 s,
 * Shift ±5 s) once focused.
 */
export function VideoTimeline({
  duration,
  time,
  watched,
  markers,
  onSeek,
  onSelect,
  onMove,
  selectedId,
  dark,
  className,
}: {
  duration: number;
  time: number;
  /** Parts already watched, drawn lighter behind the playhead. */
  watched?: [number, number][];
  markers: TimelineMarker[];
  onSeek: (t: number) => void;
  onSelect?: (id: ID) => void;
  /** Editor only: a marker was dragged to a new time. */
  onMove?: (id: ID, t: number) => void;
  selectedId?: ID | null;
  /** Light marks on a dark player bar. */
  dark?: boolean;
  className?: string;
}) {
  const bar = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ id: ID; t: number } | null>(null);
  const [scrub, setScrub] = useState<number | null>(null);
  const len = duration > 0 ? duration : 1;
  const pct = (t: number) => `${Math.max(0, Math.min(100, (t / len) * 100))}%`;
  const timeAt = (clientX: number) => {
    const r = bar.current!.getBoundingClientRect();
    return Math.max(0, Math.min(len, ((clientX - r.left) / r.width) * len));
  };
  const shown = scrub ?? time;

  return (
    <div className={cn("relative select-none py-2", className)}>
      <div
        ref={bar}
        role="slider"
        tabIndex={0}
        aria-label="Seek"
        aria-valuemin={0}
        aria-valuemax={Math.round(len)}
        aria-valuenow={Math.round(shown)}
        aria-valuetext={`${fmtTime(shown)} of ${fmtTime(len)}`}
        className={cn("relative h-2 cursor-pointer touch-none rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/60", dark ? "bg-white/25" : "bg-muted")}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          setScrub(timeAt(e.clientX));
        }}
        onPointerMove={(e) => scrub != null && setScrub(timeAt(e.clientX))}
        onPointerUp={(e) => {
          if (scrub == null) return;
          const t = timeAt(e.clientX);
          setScrub(null);
          onSeek(t);
        }}
        onPointerCancel={() => setScrub(null)}
        onKeyDown={(e) => {
          const step = e.shiftKey ? 15 : 5;
          const to = e.key === "ArrowRight" ? time + step : e.key === "ArrowLeft" ? time - step : e.key === "Home" ? 0 : e.key === "End" ? len : null;
          if (to == null) return;
          e.preventDefault();
          onSeek(Math.max(0, Math.min(len, to)));
        }}
      >
        {watched?.map(([s, e2], k) => (
          <span key={k} aria-hidden className={cn("absolute inset-y-0 rounded-full", dark ? "bg-white/35" : "bg-primary/25")} style={{ left: pct(s), width: `calc(${pct(e2)} - ${pct(s)})` }} />
        ))}
        <span aria-hidden className="absolute inset-y-0 left-0 rounded-full bg-primary" style={{ width: pct(shown) }} />
        <span aria-hidden className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-primary shadow" style={{ left: pct(shown) }} />
      </div>
      {markers.map((m, n) => {
        const t = drag?.id === m.id ? drag.t : m.time;
        const state = m.state ?? "open";
        const Icon = ICON[state];
        return (
          <button
            key={m.id}
            type="button"
            className={cn(
              "absolute top-1/2 z-10 flex size-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full shadow ring-1 transition-transform outline-none hover:scale-110 focus-visible:ring-3 focus-visible:ring-ring",
              TONE[state],
              !m.required && "size-4",
              selectedId === m.id && "scale-125 ring-2 ring-primary",
              m.problem && "ring-2 ring-amber-500",
              onMove && "cursor-grab active:cursor-grabbing touch-none",
            )}
            style={{ left: pct(t) }}
            aria-label={`${m.label} at ${fmtTime(t)}${m.required ? ", required" : ""}${m.state && m.state !== "open" ? `, ${m.state}` : ""}`}
            title={`${fmtTime(t)} · ${m.label}`}
            onClick={(e) => {
              e.stopPropagation();
              if (drag) return;
              if (onSelect) onSelect(m.id);
              else onSeek(m.time);
            }}
            onPointerDown={(e) => {
              if (!onMove || e.button !== 0) return;
              e.stopPropagation();
              e.currentTarget.setPointerCapture(e.pointerId);
              setDrag({ id: m.id, t: m.time });
            }}
            onPointerMove={(e) => drag?.id === m.id && setDrag({ id: m.id, t: Math.round(timeAt(e.clientX) * 10) / 10 })}
            onPointerUp={(e) => {
              if (drag?.id !== m.id) return;
              e.stopPropagation();
              const moved = Math.abs(drag.t - m.time) > 0.05;
              if (moved) onMove!(m.id, drag.t);
              else onSelect?.(m.id);
              // Let the click that follows the pointer-up see the drag and ignore it.
              setTimeout(() => setDrag(null));
            }}
            onKeyDown={(e) => {
              if (!onMove || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return;
              e.preventDefault();
              e.stopPropagation();
              const step = (e.shiftKey ? 5 : 1) * (e.key === "ArrowLeft" ? -1 : 1);
              onMove(m.id, Math.max(0, Math.min(len, Math.round((m.time + step) * 10) / 10)));
            }}
          >
            <Icon className="size-3" strokeWidth={3} aria-hidden />
            <span className="sr-only">{n + 1}</span>
          </button>
        );
      })}
      {drag && (
        <span className="pointer-events-none absolute -top-6 -translate-x-1/2 rounded bg-foreground px-1.5 py-0.5 text-[11px] font-medium text-background tabular-nums" style={{ left: pct(drag.t) }}>
          {fmtTime(drag.t)}
        </span>
      )}
    </div>
  );
}
