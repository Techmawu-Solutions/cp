"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Eraser, FilePlus2, Pencil, Trash2, Undo2, Users } from "lucide-react";
import { uid } from "@/lib/helpers";
import { cn } from "@/lib/utils";
import type { Stroke } from "@/components/classroom/stage-sync";

const COLORS = ["#0f172a", "#dc2626", "#2563eb", "#16a34a", "#ca8a04", "#7c3aed"];
const BG = "#ffffff";

/** Paints strokes onto a canvas context sized w × h (strokes use 0–1 board coordinates). */
export function paintStrokes(ctx: CanvasRenderingContext2D, strokes: Stroke[], w: number, h: number) {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, w, h);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const s of strokes) {
    if (s.pts.length < 2) continue;
    ctx.strokeStyle = s.eraser ? BG : s.color;
    ctx.lineWidth = Math.max(1, (s.size * w) / 1000);
    ctx.beginPath();
    ctx.moveTo(s.pts[0]! * w, s.pts[1]! * h);
    if (s.pts.length === 2) ctx.lineTo(s.pts[0]! * w + 0.01, s.pts[1]! * h);
    for (let i = 2; i < s.pts.length; i += 2) ctx.lineTo(s.pts[i]! * w, s.pts[i + 1]! * h);
    ctx.stroke();
  }
}

/** A whiteboard page as a PNG data URL (for saving to the course or downloading). */
export function boardImage(strokes: Stroke[], width = 1600): string {
  const c = document.createElement("canvas");
  c.width = width;
  c.height = Math.round((width * 9) / 16);
  paintStrokes(c.getContext("2d")!, strokes, c.width, c.height);
  return c.toDataURL("image/png");
}

export interface BoardHostTools {
  page: number;
  pages: number;
  onPage: (page: number) => void;
  onAddPage: () => void;
  onClear: () => void;
  /** Whether every student may draw. */
  studentsDraw: boolean;
  onStudentsDraw: (on: boolean) => void;
}

/**
 * Shared whiteboard (spec §32 teaching). It draws whatever strokes it's
 * given, so every screen in the class shows the same board; the teacher's
 * (and permitted students') pen strokes are sent out as they're drawn.
 * The board is 16:9 on every screen so drawings line up. Pointer events
 * cover mouse, pen and touch.
 */
export function Whiteboard({ strokes, selfId, canDraw, onStroke, onUndo, host }: { strokes: Stroke[]; selfId: string; canDraw: boolean; onStroke: (s: Stroke) => void; onUndo: () => void; host?: BoardHostTools }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [color, setColor] = useState(COLORS[0]!);
  const [size, setSize] = useState(4);
  const [tool, setTool] = useState<"pen" | "eraser">("pen");
  const current = useRef<Stroke | null>(null);
  const lastSent = useRef(0);
  const strokesRef = useRef(strokes);

  const redraw = () => {
    const c = canvas.current;
    if (!c || !c.width) return;
    const list = current.current && !strokesRef.current.some((s) => s.id === current.current!.id) ? [...strokesRef.current, current.current] : strokesRef.current;
    paintStrokes(c.getContext("2d")!, list, c.width, c.height);
  };

  useEffect(() => {
    strokesRef.current = strokes;
    redraw();
  });

  useEffect(() => {
    const c = canvas.current!;
    const resize = () => {
      const rect = c.getBoundingClientRect();
      c.width = Math.round(rect.width * devicePixelRatio);
      c.height = Math.round(rect.height * devicePixelRatio);
      redraw();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(c);
    return () => ro.disconnect();
  }, []);

  const point = (e: React.PointerEvent) => {
    const rect = canvas.current!.getBoundingClientRect();
    return [Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)), Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height))] as const;
  };
  const down = (e: React.PointerEvent) => {
    if (!canDraw) return;
    canvas.current!.setPointerCapture(e.pointerId);
    const [x, y] = point(e);
    current.current = {
      id: uid("stk"),
      by: selfId,
      color,
      size: tool === "eraser" ? size * 6 : size,
      eraser: tool === "eraser" || undefined,
      pts: [x, y],
    };
    onStroke(current.current);
    lastSent.current = performance.now();
  };
  const move = (e: React.PointerEvent) => {
    const s = current.current;
    if (!s) return;
    const [x, y] = point(e);
    s.pts = [...s.pts, x, y];
    // Draw locally at once; send to the class a few dozen times a second.
    const c = canvas.current!;
    const ctx = c.getContext("2d")!;
    const n = s.pts.length;
    ctx.strokeStyle = s.eraser ? BG : s.color;
    ctx.lineWidth = Math.max(1, (s.size * c.width) / 1000);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(s.pts[n - 4]! * c.width, s.pts[n - 3]! * c.height);
    ctx.lineTo(x * c.width, y * c.height);
    ctx.stroke();
    if (performance.now() - lastSent.current > 40) {
      onStroke({ ...s });
      lastSent.current = performance.now();
    }
  };
  const up = () => {
    if (current.current) onStroke({ ...current.current });
    current.current = null;
  };

  const drawnByOthers = strokes.some((s) => s.by !== selfId);
  const btn = "rounded-md p-1.5 hover:bg-slate-700 disabled:opacity-40";

  return (
    <div className="flex size-full flex-col bg-slate-900">
      {/* Tools sit in a strip above the board (scrolling sideways on phones) so they never cover the drawing. */}
      {canDraw && (
        <div className="flex shrink-0 items-center gap-1 overflow-x-auto px-2 py-1.5 text-white [scrollbar-width:none] sm:justify-center [&::-webkit-scrollbar]:hidden [&>*]:shrink-0">
          <button onClick={() => setTool("pen")} className={cn("rounded-md p-1.5", tool === "pen" && "bg-slate-700")} aria-label="Pen" title="Pen">
            <Pencil className="size-4" />
          </button>
          <button onClick={() => setTool("eraser")} className={cn("rounded-md p-1.5", tool === "eraser" && "bg-slate-700")} aria-label="Eraser" title="Eraser">
            <Eraser className="size-4" />
          </button>
          <span className="mx-0.5 h-5 w-px bg-slate-600" />
          {COLORS.map((c) => (
            <button key={c} onClick={() => (setColor(c), setTool("pen"))} className={cn("size-5 rounded-full border-2", color === c && tool === "pen" ? "border-white" : "border-transparent")} style={{ background: c }} aria-label={`Colour ${c}`} />
          ))}
          <input type="range" min={2} max={16} value={size} onChange={(e) => setSize(Number(e.target.value))} className="mx-1 w-14 accent-blue-500" aria-label="Brush size" />
          <button onClick={onUndo} className={btn} aria-label="Undo my last stroke" title="Undo">
            <Undo2 className="size-4" />
          </button>
          {host && (
            <>
              <button onClick={host.onClear} className={btn} aria-label="Clear page" title="Clear page">
                <Trash2 className="size-4" />
              </button>
              <span className="mx-0.5 h-5 w-px bg-slate-600" />
              <button onClick={() => host.onPage(host.page - 1)} disabled={host.page === 0} className={btn} aria-label="Previous page" title="Previous page">
                <ChevronLeft className="size-4" />
              </button>
              <span className="text-xs tabular-nums">
                {host.page + 1}/{host.pages}
              </span>
              <button onClick={() => host.onPage(host.page + 1)} disabled={host.page >= host.pages - 1} className={btn} aria-label="Next page" title="Next page">
                <ChevronRight className="size-4" />
              </button>
              <button onClick={host.onAddPage} className={btn} aria-label="New page" title="New page">
                <FilePlus2 className="size-4" />
              </button>
              <button
                onClick={() => host.onStudentsDraw(!host.studentsDraw)}
                className={cn("flex items-center gap-1 rounded-md px-1.5 py-1 text-xs", host.studentsDraw ? "bg-emerald-600" : "hover:bg-slate-700")}
                aria-pressed={host.studentsDraw}
                title={host.studentsDraw ? "Students can draw — tap to stop" : "Let students draw"}
              >
                <Users className="size-4" /> <span className="max-sm:hidden">{host.studentsDraw ? "Students drawing" : "Let students draw"}</span>
              </button>
              <button
                onClick={() => {
                  const a = document.createElement("a");
                  a.href = boardImage(strokes);
                  a.download = `whiteboard-page-${host.page + 1}.png`;
                  a.click();
                }}
                className={btn}
                aria-label="Download page"
                title="Download page"
              >
                <Download className="size-4" />
              </button>
            </>
          )}
        </div>
      )}
      {/* Size containment lets the board be exactly 16:9 at the largest size that fits, on any screen. */}
      <div className="flex min-h-0 flex-1 items-center justify-center" style={{ containerType: "size" }}>
        <div
          className="relative"
          style={{
            width: "min(100cqw, calc(100cqh * 16 / 9))",
            aspectRatio: "16 / 9",
          }}
        >
          <canvas ref={canvas} className={cn("size-full touch-none rounded-lg bg-white", canDraw && "cursor-crosshair")} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} />
          {!host && (
            <span className={cn("absolute bottom-2 left-2 rounded px-2 py-1 text-xs text-white", canDraw ? "bg-emerald-600/90" : "bg-slate-900/80")}>
              {canDraw ? "The teacher has let you draw" : drawnByOthers || strokes.length ? "Whiteboard · view only" : "Whiteboard · waiting for the teacher to draw"}
            </span>
          )}
          {host && (
            <span className="absolute bottom-2 left-2 rounded bg-slate-900/80 px-2 py-1 text-xs text-white">
              Students see this board live
              {host.pages > 1 ? ` · page ${host.page + 1}` : ""}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
