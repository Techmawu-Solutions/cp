"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, ChevronDown, ChevronLeft, ChevronRight, Circle, Download, Eraser, FilePlus2, LineChart, Minus, Pencil, Square, Trash2, Triangle, Type, Undo2, Users } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { GraphDialog, type GraphPlace } from "@/components/classroom/graph-dialog";
import { BOARD_BG, boardImage, paintStroke, paintStrokes, textPx } from "@/components/classroom/board-paint";
import { uid } from "@/lib/helpers";
import { cn } from "@/lib/utils";
import type { Drawers, Stroke, StrokeKind } from "@/components/classroom/stage-sync";

export { boardImage } from "@/components/classroom/board-paint";

const COLORS = ["#0f172a", "#dc2626", "#2563eb", "#16a34a", "#ca8a04", "#7c3aed"];

type Tool = "pen" | "eraser" | "line" | "arrow" | "rect" | "ellipse" | "triangle" | "text";
type ShapeTool = Extract<Tool, "line" | "arrow" | "rect" | "ellipse" | "triangle">;

const SHAPES: { tool: ShapeTool; label: string; icon: React.ReactNode }[] = [
  { tool: "line", label: "Line", icon: <Minus className="size-4" /> },
  { tool: "arrow", label: "Arrow", icon: <ArrowUpRight className="size-4" /> },
  { tool: "rect", label: "Rectangle", icon: <Square className="size-4" /> },
  { tool: "ellipse", label: "Circle / ellipse", icon: <Circle className="size-4" /> },
  { tool: "triangle", label: "Triangle", icon: <Triangle className="size-4" /> },
];
const isShape = (t: Tool): t is ShapeTool => SHAPES.some((s) => s.tool === t);

/** Where a graph goes on the board: x, y, width, height (a half is roughly square, the whole board 4:3). */
const GRAPH_BOX: Record<GraphPlace, number[]> = { left: [0.02, 0.05, 0.47, 0.9], right: [0.51, 0.05, 0.47, 0.9], full: [0.18, 0.05, 0.64, 0.9] };

export interface BoardHostTools {
  page: number;
  pages: number;
  onPage: (page: number) => void;
  onAddPage: () => void;
  onClear: () => void;
  /** Who besides the teacher may draw, and the students who could. */
  drawers: Drawers;
  students: { id: string; name: string }[];
  onDrawers: (d: Drawers) => void;
}

const firstName = (n: string) => n.split(" ")[0] ?? n;

/**
 * Shared whiteboard (spec §32 teaching). It draws whatever items it's given
 * — pen strokes, shapes, text and graphs — so every screen in the class
 * shows the same board; items are sent out as they're drawn. The board is
 * 16:9 on every screen so drawings line up. Pointer events cover mouse, pen
 * and touch.
 */
export function Whiteboard({ strokes, selfId, canDraw, onStroke, onUndo, host, label }: { strokes: Stroke[]; selfId: string; canDraw: boolean; onStroke: (s: Stroke) => void; onUndo: () => void; host?: BoardHostTools; label?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [color, setColor] = useState(COLORS[0]!);
  const [size, setSize] = useState(4);
  const [tool, setTool] = useState<Tool>("pen");
  const [shape, setShape] = useState<ShapeTool>("line");
  const [graphOpen, setGraphOpen] = useState(false);
  // Text being typed: where on the board, and the board's width then (for the font size).
  const [textAt, setTextAt] = useState<{ x: number; y: number; boardPx: number } | null>(null);
  const [text, setText] = useState("");
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
  const send = (s: Stroke, force = false) => {
    if (force || performance.now() - lastSent.current > 40) {
      onStroke({ ...s, pts: [...s.pts] });
      lastSent.current = performance.now();
    }
  };

  const commitText = () => {
    if (textAt && text.trim()) onStroke({ id: uid("stk"), by: selfId, kind: "text", color, size, pts: [textAt.x, textAt.y], text: text.trim() });
    setTextAt(null);
    setText("");
  };

  const down = (e: React.PointerEvent) => {
    if (!canDraw) return;
    const [x, y] = point(e);
    if (tool === "text") {
      // Stop the browser's mouse-down focus handling, which would blur the new text field straight away.
      e.preventDefault();
      commitText();
      setTextAt({ x, y, boardPx: canvas.current!.getBoundingClientRect().width });
      return;
    }
    canvas.current!.setPointerCapture(e.pointerId);
    const kind: StrokeKind = isShape(tool) ? tool : "pen";
    current.current = { id: uid("stk"), by: selfId, kind, color, size: tool === "eraser" ? size * 6 : size, eraser: tool === "eraser" || undefined, pts: kind === "pen" ? [x, y] : [x, y, x, y] };
    send(current.current, true);
  };
  const move = (e: React.PointerEvent) => {
    const s = current.current;
    if (!s) return;
    const [x, y] = point(e);
    if ((s.kind ?? "pen") === "pen") {
      s.pts = [...s.pts, x, y];
      // Draw the new segment at once; the whole stroke is sent to the class a few dozen times a second.
      const c = canvas.current!;
      const n = s.pts.length;
      paintStroke(c.getContext("2d")!, { ...s, pts: s.pts.slice(n - 4) }, c.width, c.height);
    } else {
      s.pts = [s.pts[0]!, s.pts[1]!, x, y];
      redraw();
    }
    send(s);
  };
  const up = () => {
    if (current.current) send(current.current, true);
    current.current = null;
  };

  const drawnByOthers = strokes.some((s) => s.by !== selfId);
  const btn = "rounded-md p-1.5 hover:bg-slate-700 disabled:opacity-40";
  const shapeInfo = SHAPES.find((s) => s.tool === shape)!;

  // Teacher: who may draw, as a single choice (one student can be asked to answer on the board).
  const drawersValue = !host ? "" : host.drawers === "none" ? "none" : host.drawers === "all" ? "all" : host.drawers.length === 1 ? `one:${host.drawers[0]}` : "some";
  const drawersLabel = !host ? "" : host.drawers === "none" ? "Only me" : host.drawers === "all" ? "Everyone draws" : host.drawers.length === 1 ? `${firstName(host.students.find((s) => s.id === (host.drawers as string[])[0])?.name ?? "Student")} is answering` : `${host.drawers.length} students`;

  return (
    <div className="flex size-full flex-col bg-slate-900">
      {/* Tools sit in a strip above the board (scrolling sideways on phones) so they never cover the drawing. */}
      {canDraw && (
        <div className="flex shrink-0 items-center gap-1 overflow-x-auto px-2 py-1.5 text-white [scrollbar-width:none] sm:justify-center [&::-webkit-scrollbar]:hidden [&>*]:shrink-0">
          <button onClick={() => setTool("pen")} className={cn(btn, tool === "pen" && "bg-slate-700")} aria-label="Pen" title="Pen" aria-pressed={tool === "pen"}>
            <Pencil className="size-4" />
          </button>
          <div className={cn("flex items-center rounded-md", isShape(tool) && "bg-slate-700")}>
            <button onClick={() => setTool(shape)} className="rounded-l-md p-1.5 hover:bg-slate-600" aria-label={`Shape: ${shapeInfo.label}`} title={shapeInfo.label} aria-pressed={isShape(tool)}>
              {shapeInfo.icon}
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger className="rounded-r-md px-0.5 py-1.5 outline-none hover:bg-slate-600" aria-label="Choose a shape">
                <ChevronDown className="size-3" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-44">
                <DropdownMenuRadioGroup value={shape} onValueChange={(v) => (setShape(v as ShapeTool), setTool(v as ShapeTool))}>
                  {SHAPES.map((s) => (
                    <DropdownMenuRadioItem key={s.tool} value={s.tool} closeOnClick>
                      {s.icon} {s.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <button onClick={() => setTool("text")} className={cn(btn, tool === "text" && "bg-slate-700")} aria-label="Text" title="Text — tap the board, then type" aria-pressed={tool === "text"}>
            <Type className="size-4" />
          </button>
          <button onClick={() => setGraphOpen(true)} className={btn} aria-label="Plot a graph" title="Plot a graph">
            <LineChart className="size-4" />
          </button>
          <button onClick={() => setTool("eraser")} className={cn(btn, tool === "eraser" && "bg-slate-700")} aria-label="Eraser" title="Eraser" aria-pressed={tool === "eraser"}>
            <Eraser className="size-4" />
          </button>
          <span className="mx-0.5 h-5 w-px bg-slate-600" />
          {COLORS.map((c) => (
            <button key={c} onClick={() => (setColor(c), tool === "eraser" && setTool("pen"))} className={cn("size-5 rounded-full border-2", color === c && tool !== "eraser" ? "border-white" : "border-transparent")} style={{ background: c }} aria-label={`Colour ${c}`} />
          ))}
          <input type="range" min={2} max={16} value={size} onChange={(e) => setSize(Number(e.target.value))} className="mx-1 w-14 accent-blue-500" aria-label="Size" title="Line and text size" />
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
              <DropdownMenu>
                <DropdownMenuTrigger className={cn("flex items-center gap-1 rounded-md px-1.5 py-1 text-xs outline-none", host.drawers === "none" ? "hover:bg-slate-700" : "bg-emerald-600")} aria-label={`Who can draw: ${drawersLabel}`} title="Who can draw on the board">
                  <Users className="size-4" /> <span className="max-w-32 truncate">{drawersLabel}</span> <ChevronDown className="size-3" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="max-h-80 w-60">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>Who can draw</DropdownMenuLabel>
                    <DropdownMenuRadioGroup value={drawersValue} onValueChange={(v) => host.onDrawers(v === "none" ? "none" : v === "all" ? "all" : [String(v).slice(4)])}>
                      <DropdownMenuRadioItem value="none" closeOnClick>
                        Only me
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="all" closeOnClick>
                        Everyone
                      </DropdownMenuRadioItem>
                      {host.drawers !== "none" && host.drawers !== "all" && host.drawers.length > 1 && (
                        <DropdownMenuRadioItem value="some" disabled>
                          {host.drawers.length} students (set in People)
                        </DropdownMenuRadioItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel>Ask one student to answer</DropdownMenuLabel>
                      {host.students.length === 0 && <p className="px-2 py-1.5 text-xs text-muted-foreground">No students in class yet.</p>}
                      {host.students.map((s) => (
                        <DropdownMenuRadioItem key={s.id} value={`one:${s.id}`} closeOnClick>
                          {s.name}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
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
        <div className="relative" style={{ width: "min(100cqw, calc(100cqh * 16 / 9))", aspectRatio: "16 / 9" }}>
          <canvas ref={canvas} className={cn("size-full touch-none rounded-lg", canDraw && (tool === "text" ? "cursor-text" : "cursor-crosshair"))} style={{ background: BOARD_BG }} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} />
          {textAt && (
            <input
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitText();
                if (e.key === "Escape") {
                  setTextAt(null);
                  setText("");
                }
              }}
              onBlur={commitText}
              placeholder="Type, then Enter"
              aria-label="Text on the board"
              className="absolute min-w-40 border-b-2 border-dashed border-blue-500 bg-transparent font-medium outline-none"
              style={{ left: `${textAt.x * 100}%`, top: `${textAt.y * 100}%`, color, fontSize: textPx(size, textAt.boardPx), lineHeight: 1 }}
            />
          )}
          {!host && (
            <span className={cn("absolute bottom-2 left-2 rounded px-2 py-1 text-xs text-white", canDraw ? "bg-emerald-600/90" : "bg-slate-900/80")}>
              {label ?? (canDraw ? "The teacher has let you draw" : drawnByOthers || strokes.length ? "Whiteboard · view only" : "Whiteboard · waiting for the teacher to draw")}
            </span>
          )}
          {host && (
            <span className="absolute bottom-2 left-2 rounded bg-slate-900/80 px-2 py-1 text-xs text-white">
              Students see this board live{host.pages > 1 ? ` · page ${host.page + 1}` : ""}
              {host.drawers !== "none" ? ` · ${drawersLabel}` : ""}
            </span>
          )}
        </div>
      </div>
      {canDraw && <GraphDialog open={graphOpen} onOpenChange={setGraphOpen} boardHasContent={strokes.length > 0} onInsert={(graph, place) => onStroke({ id: uid("stk"), by: selfId, kind: "graph", color: "#0f172a", size: 2, pts: GRAPH_BOX[place], graph })} />}
    </div>
  );
}
