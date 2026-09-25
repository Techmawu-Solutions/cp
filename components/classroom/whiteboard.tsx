"use client";

import { useEffect, useRef, useState } from "react";
import { Eraser, Pencil, Trash2, Undo2, Download } from "lucide-react";
import { cn } from "@/lib/utils";

const COLORS = ["#0f172a", "#dc2626", "#2563eb", "#16a34a", "#ca8a04", "#7c3aed"];

/** Shared whiteboard (spec §32 teaching). Pointer events cover mouse, pen and touch. */
export function Whiteboard({ readOnly }: { readOnly?: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [color, setColor] = useState(COLORS[0]!);
  const [size, setSize] = useState(4);
  const [tool, setTool] = useState<"pen" | "eraser">("pen");
  const history = useRef<ImageData[]>([]);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const c = canvas.current!;
    const resize = () => {
      const snapshot = c.width ? c.getContext("2d")!.getImageData(0, 0, c.width, c.height) : null;
      const rect = c.getBoundingClientRect();
      c.width = rect.width * devicePixelRatio;
      c.height = rect.height * devicePixelRatio;
      const ctx = c.getContext("2d")!;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, c.width, c.height);
      if (snapshot) ctx.putImageData(snapshot, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(c);
    return () => ro.disconnect();
  }, []);

  const point = (e: React.PointerEvent) => {
    const rect = canvas.current!.getBoundingClientRect();
    return { x: (e.clientX - rect.left) * devicePixelRatio, y: (e.clientY - rect.top) * devicePixelRatio };
  };
  const down = (e: React.PointerEvent) => {
    if (readOnly) return;
    const c = canvas.current!;
    c.setPointerCapture(e.pointerId);
    history.current = [...history.current.slice(-19), c.getContext("2d")!.getImageData(0, 0, c.width, c.height)];
    drawing.current = true;
    last.current = point(e);
  };
  const move = (e: React.PointerEvent) => {
    if (!drawing.current || !last.current) return;
    const ctx = canvas.current!.getContext("2d")!;
    const p = point(e);
    ctx.strokeStyle = tool === "eraser" ? "#fff" : color;
    ctx.lineWidth = (tool === "eraser" ? size * 5 : size) * devicePixelRatio;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
  };
  const up = () => {
    drawing.current = false;
    last.current = null;
  };
  const clear = () => {
    const c = canvas.current!;
    const ctx = c.getContext("2d")!;
    history.current.push(ctx.getImageData(0, 0, c.width, c.height));
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
  };
  const undo = () => {
    const prev = history.current.pop();
    if (prev) canvas.current!.getContext("2d")!.putImageData(prev, 0, 0);
  };

  return (
    <div className="relative size-full bg-white">
      <canvas ref={canvas} className={cn("size-full touch-none", !readOnly && "cursor-crosshair")} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up} />
      {!readOnly && (
        <div className="absolute top-2 left-1/2 flex -translate-x-1/2 flex-wrap items-center gap-1 rounded-xl bg-slate-900/90 p-1.5 text-white shadow-lg">
          <button onClick={() => setTool("pen")} className={cn("rounded-md p-1.5", tool === "pen" && "bg-slate-700")} aria-label="Pen">
            <Pencil className="size-4" />
          </button>
          <button onClick={() => setTool("eraser")} className={cn("rounded-md p-1.5", tool === "eraser" && "bg-slate-700")} aria-label="Eraser">
            <Eraser className="size-4" />
          </button>
          <span className="mx-1 h-5 w-px bg-slate-600" />
          {COLORS.map((c) => (
            <button key={c} onClick={() => (setColor(c), setTool("pen"))} className={cn("size-5 rounded-full border-2", color === c && tool === "pen" ? "border-white" : "border-transparent")} style={{ background: c }} aria-label={`Colour ${c}`} />
          ))}
          <input type="range" min={2} max={16} value={size} onChange={(e) => setSize(Number(e.target.value))} className="mx-1 w-16 accent-blue-500" aria-label="Brush size" />
          <button onClick={undo} className="rounded-md p-1.5 hover:bg-slate-700" aria-label="Undo">
            <Undo2 className="size-4" />
          </button>
          <button onClick={clear} className="rounded-md p-1.5 hover:bg-slate-700" aria-label="Clear">
            <Trash2 className="size-4" />
          </button>
          <button
            onClick={() => {
              const a = document.createElement("a");
              a.href = canvas.current!.toDataURL("image/png");
              a.download = "whiteboard.png";
              a.click();
            }}
            className="rounded-md p-1.5 hover:bg-slate-700"
            aria-label="Save as image"
          >
            <Download className="size-4" />
          </button>
        </div>
      )}
      {readOnly && <span className="absolute top-2 left-2 rounded bg-slate-900/80 px-2 py-1 text-xs text-white">Whiteboard · view only</span>}
    </div>
  );
}
