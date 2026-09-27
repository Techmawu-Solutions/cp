"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight, ChevronDown, Circle, Copy, Download, Eraser, Eye, EyeOff, LineChart, Minus, MoreVertical, Pencil, Pin, PinOff, Plus, Sigma, Square, Trash2, Triangle, Type, Undo2, Users } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { GraphDialog, type GraphPlace } from "@/components/classroom/graph-dialog";
import { MathDialog } from "@/components/classroom/math-dialog";
import { prepareBoardMath, textToTex } from "@/components/classroom/board-math";
import { BOARD_BG, boardImage, paintStroke, paintStrokes, textPx } from "@/components/classroom/board-paint";
import { uid } from "@/lib/helpers";
import { cn } from "@/lib/utils";
import type { BoardPage, Drawers, Stroke, StrokeKind } from "@/components/classroom/stage-sync";

export { boardImage } from "@/components/classroom/board-paint";

const COLORS = ["#0f172a", "#dc2626", "#2563eb", "#16a34a", "#ca8a04", "#7c3aed"];

type Tool = "pen" | "eraser" | "line" | "arrow" | "rect" | "ellipse" | "triangle" | "text" | "math";
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
  /** Flip-chart pages; `page` is the one the teacher is on. */
  page: number;
  pages: BoardPage[];
  /** The page students see, and the pinned page (null: students follow the teacher). */
  shownId: string | undefined;
  pinned: string | null;
  onPage: (page: number) => void;
  onAddPage: () => void;
  onDuplicate: (id: string) => void;
  onMove: (id: string, by: -1 | 1) => void;
  onDelete: (id: string) => void;
  onPin: (id: string | null) => void;
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
  // Where the next formula goes (the maths tool: tap the board, then write it).
  const [mathAt, setMathAt] = useState<{ x: number; y: number } | null>(null);
  // Text being typed: where on the board, and the board's width then (for the font size).
  const [textAt, setTextAt] = useState<{ x: number; y: number; boardPx: number } | null>(null);
  const [text, setText] = useState("");
  const current = useRef<Stroke | null>(null);
  const lastSent = useRef(0);
  const strokesRef = useRef(strokes);
  // Latest redraw, for the resize observer and for formulas that finish preparing later.
  const redrawRef = useRef(() => {});

  const redraw = () => {
    const c = canvas.current;
    if (!c || !c.width) return;
    const list = current.current && !strokesRef.current.some((s) => s.id === current.current!.id) ? [...strokesRef.current, current.current] : strokesRef.current;
    paintStrokes(c.getContext("2d")!, list, c.width, c.height, () => redrawRef.current());
  };

  useEffect(() => {
    strokesRef.current = strokes;
    redrawRef.current = redraw;
    redraw();
  });

  useEffect(() => {
    const c = canvas.current!;
    const resize = () => {
      const rect = c.getBoundingClientRect();
      c.width = Math.round(rect.width * devicePixelRatio);
      c.height = Math.round(rect.height * devicePixelRatio);
      redrawRef.current();
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
    // Text with $…$ in it becomes a formula (the words stay as words).
    const tex = text.trim() ? textToTex(text.trim()) : null;
    if (textAt && text.trim()) onStroke(tex ? { id: uid("stk"), by: selfId, kind: "math", color, size, pts: [textAt.x, textAt.y], tex } : { id: uid("stk"), by: selfId, kind: "text", color, size, pts: [textAt.x, textAt.y], text: text.trim() });
    setTextAt(null);
    setText("");
  };

  const down = (e: React.PointerEvent) => {
    if (!canDraw) return;
    const [x, y] = point(e);
    if (tool === "math") {
      e.preventDefault();
      setMathAt({ x, y });
      return;
    }
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
  const shownIndex = host ? host.pages.findIndex((p) => p.id === host.shownId) : -1;
  const privatePage = !!host && host.pages[host.page]?.id !== host.shownId;
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
          <button onClick={() => setTool("math")} className={cn(btn, tool === "math" && "bg-slate-700")} aria-label="Equation" title="Equation or formula (LaTeX) — tap the board where it should go" aria-pressed={tool === "math"}>
            <Sigma className="size-4" />
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
                onClick={async () => {
                  await prepareBoardMath(strokes);
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
          <canvas ref={canvas} className={cn("size-full touch-none rounded-lg", canDraw && (tool === "text" ? "cursor-text" : tool === "math" ? "cursor-copy" : "cursor-crosshair"))} style={{ background: BOARD_BG }} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} />
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
              placeholder="Type, then Enter ($…$ for maths)"
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
            // Whether students can see the page the teacher is on right now.
            <span className={cn("absolute bottom-2 left-2 flex max-w-[calc(100%-1rem)] items-center gap-1.5 rounded px-2 py-1 text-xs text-white", privatePage ? "bg-amber-600/95" : "bg-slate-900/80")}>
              {privatePage ? <EyeOff className="size-3.5 shrink-0" /> : <Eye className="size-3.5 shrink-0" />}
              <span className="truncate">
                {privatePage ? `Private — students see page ${shownIndex + 1}${host.pinned ? " (pinned)" : ""}` : `Students see this page live${host.pinned ? " · pinned" : ""}`}
                {host.drawers !== "none" ? ` · ${drawersLabel}` : ""}
              </span>
            </span>
          )}
        </div>
      </div>
      {host && <PageStrip host={host} />}
      {canDraw && <MathDialog open={!!mathAt} onOpenChange={(o) => !o && setMathAt(null)} color={color} onInsert={(tex) => mathAt && onStroke({ id: uid("stk"), by: selfId, kind: "math", color, size, pts: [mathAt.x, mathAt.y], tex })} />}
      {canDraw && <GraphDialog open={graphOpen} onOpenChange={setGraphOpen} boardHasContent={strokes.length > 0} onInsert={(graph, place) => onStroke({ id: uid("stk"), by: selfId, kind: "graph", color: "#0f172a", size: 2, pts: GRAPH_BOX[place], graph })} />}
    </div>
  );
}

/** Flip chart pages for the teacher: thumbnails to move between pages, and each page's actions. */
function PageStrip({ host }: { host: BoardHostTools }) {
  const [deleting, setDeleting] = useState<string | null>(null);
  const current = host.pages[host.page];
  return (
    <div className="flex shrink-0 items-center gap-2 overflow-x-auto px-2 pt-1 pb-2 [scrollbar-width:thin]" role="list" aria-label="Whiteboard pages">
      {host.pages.map((p, i) => {
        const isCurrent = i === host.page;
        const shown = p.id === host.shownId;
        const pinned = p.id === host.pinned;
        return (
          <div key={p.id} role="listitem" className="relative shrink-0">
            <button
              type="button"
              onClick={() => host.onPage(i)}
              className={cn("block w-24 overflow-hidden rounded-md ring-2 transition-shadow sm:w-28", isCurrent ? "ring-blue-500" : "ring-slate-700 hover:ring-slate-500")}
              aria-label={`Page ${i + 1}${shown ? ", students see this page" : ", private"}${pinned ? ", pinned" : ""}`}
              aria-current={isCurrent ? "page" : undefined}
            >
              <PageThumb strokes={p.strokes} />
            </button>
            <span className="pointer-events-none absolute top-1 left-1 rounded bg-slate-900/80 px-1 text-[10px] font-semibold text-white tabular-nums">{i + 1}</span>
            <span className={cn("pointer-events-none absolute right-1 bottom-1 flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] text-white", shown ? "bg-emerald-600" : "bg-slate-900/80")} title={shown ? "Students see this page" : "Private — students can't see this page"}>
              {pinned && <Pin className="size-2.5" />}
              {shown ? <Eye className="size-2.5" /> : <EyeOff className="size-2.5" />}
            </span>
            {isCurrent && (
              <DropdownMenu>
                <DropdownMenuTrigger className="absolute top-0.5 right-0.5 rounded bg-slate-900/80 p-0.5 text-white outline-none hover:bg-slate-700" aria-label={`Page ${i + 1} options`}>
                  <MoreVertical className="size-3.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  {pinned ? (
                    <DropdownMenuItem onClick={() => host.onPin(null)}>
                      <PinOff /> Unpin — students follow my page
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => host.onPin(p.id)}>
                      <Pin /> {shown ? "Pin for students" : "Show this page to students"}
                      <span className="ml-auto text-[10px] text-muted-foreground">then write privately</span>
                    </DropdownMenuItem>
                  )}
                  {host.pinned && !pinned && (
                    <DropdownMenuItem onClick={() => host.onPin(null)}>
                      <Eye /> Students follow my page
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => host.onDuplicate(p.id)}>
                    <Copy /> Duplicate page
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled={i === 0} onClick={() => host.onMove(p.id, -1)}>
                    <ArrowLeft /> Move left
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled={i === host.pages.length - 1} onClick={() => host.onMove(p.id, 1)}>
                    <ArrowRight /> Move right
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={() => (p.strokes.length ? setDeleting(p.id) : host.onDelete(p.id))}>
                    <Trash2 /> Delete page
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        );
      })}
      <button type="button" onClick={host.onAddPage} className="flex aspect-video w-16 shrink-0 flex-col items-center justify-center gap-0.5 rounded-md border border-dashed border-slate-600 text-[10px] text-slate-300 hover:border-slate-400 hover:text-white sm:w-20" aria-label="New page">
        <Plus className="size-4" /> New page
      </button>
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete page ${host.pages.findIndex((p) => p.id === deleting) + 1}?`}
        description={deleting === host.pinned ? "Students are looking at this page — they'll follow your page instead. Everything on it is removed." : "Everything on this page is removed."}
        destructive
        confirmLabel="Delete page"
        onConfirm={() => {
          if (deleting) host.onDelete(deleting);
          setDeleting(null);
        }}
      />
      {current && host.pages.length > 1 && <span className="sr-only">Page {host.page + 1} of {host.pages.length}</span>}
    </div>
  );
}

/** A small live picture of a page. */
function PageThumb({ strokes }: { strokes: Stroke[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const draw = () => paintStrokes(c.getContext("2d")!, strokes, c.width, c.height, draw);
    draw();
  }, [strokes]);
  return <canvas ref={ref} width={224} height={126} className="block aspect-video w-full bg-white" />;
}
