"use client";

import { useEffect, useRef, useState } from "react";
import { LineChart, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { paintGraph } from "@/components/classroom/board-paint";
import { autoRange, expressionProblem, parsePoints, type GraphSeries, type GraphSpec } from "@/lib/graph-math";
import { cn } from "@/lib/utils";

const SERIES_COLORS = ["#2563eb", "#dc2626", "#16a34a", "#7c3aed"];

interface Row {
  type: "fn" | "points";
  expr: string;
  points: string;
  join: boolean;
  labels: boolean;
}

const EXAMPLES: { label: string; row: Partial<Row> & { type: Row["type"] } }[] = [
  { label: "y = 2x + 1", row: { type: "fn", expr: "2x + 1" } },
  { label: "y = x² − 4", row: { type: "fn", expr: "x^2 - 4" } },
  { label: "y = sin x", row: { type: "fn", expr: "sin(x)" } },
  { label: "y = 1/x", row: { type: "fn", expr: "1/x" } },
  { label: "(1,2) (2,4) (3,6)", row: { type: "points", points: "(1, 2) (2, 4) (3, 6)" } },
];

const blank = (type: Row["type"] = "fn"): Row => ({ type, expr: "", points: "", join: true, labels: true });

const toSeries = (r: Row, i: number): GraphSeries | null => {
  const color = SERIES_COLORS[i % SERIES_COLORS.length]!;
  if (r.type === "fn") return r.expr.trim() && !expressionProblem(r.expr) ? { type: "fn", expr: r.expr.trim(), color } : null;
  const { points, problem } = parsePoints(r.points);
  return !problem ? { type: "points", points, color, join: r.join, labels: r.labels } : null;
};

/**
 * Plot a graph onto the whiteboard (spec section 32): type a function of x or a list
 * of coordinates (up to four of them); axes, grid and range are drawn for you.
 */
export type GraphPlace = "right" | "left" | "full";

export function GraphDialog({ open, onOpenChange, onInsert, boardHasContent }: { open: boolean; onOpenChange: (o: boolean) => void; onInsert: (g: GraphSpec, place: GraphPlace) => void; boardHasContent: boolean }) {
  const [rows, setRows] = useState<Row[]>([blank()]);
  const [auto, setAuto] = useState(true);
  const [grid, setGrid] = useState(true);
  const [place, setPlace] = useState<GraphPlace | null>(null);
  // Next to what's already on the board by default; the whole board when it's empty.
  const where: GraphPlace = place ?? (boardHasContent ? "right" : "full");
  const [range, setRange] = useState({ xMin: "-10", xMax: "10", yMin: "-10", yMax: "10" });
  const preview = useRef<HTMLCanvasElement>(null);

  const problems = rows.map((r) => (r.type === "fn" ? (r.expr.trim() ? expressionProblem(r.expr) : "Enter a function of x, e.g. 2x + 1") : parsePoints(r.points).problem));
  const series = rows.map(toSeries).filter((s): s is GraphSeries => !!s);
  const manual = { xMin: Number(range.xMin), xMax: Number(range.xMax), yMin: Number(range.yMin), yMax: Number(range.yMax) };
  const rangeProblem = auto ? null : Object.values(range).some((v) => v.trim() === "" || !Number.isFinite(Number(v))) ? "Enter all four axis limits." : manual.xMin >= manual.xMax || manual.yMin >= manual.yMax ? "Each axis must go from a smaller to a larger number." : null;
  const spec: GraphSpec | null = series.length && !rangeProblem ? { ...(auto ? autoRange(series) : manual), grid, series } : null;
  const ready = !!spec && problems.every((p) => !p);

  useEffect(() => {
    const c = preview.current;
    if (!c) return;
    const rect = c.getBoundingClientRect();
    c.width = Math.round(rect.width * devicePixelRatio);
    c.height = Math.round(rect.height * devicePixelRatio);
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
    if (spec) paintGraph(ctx, spec, 0, 0, c.width, c.height, c.width / 700);
  });

  const set = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LineChart className="size-5" /> Plot a graph
          </DialogTitle>
          <DialogDescription>Type a function of x or the coordinates of points. The axes, grid and range are drawn for you, and the graph appears on everyone&apos;s board.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-1.5">
          <span className="text-xs text-muted-foreground">Try:</span>
          {EXAMPLES.map((e) => (
            <button key={e.label} type="button" onClick={() => setRows((rs) => (rs.length === 1 && !rs[0]!.expr && !rs[0]!.points ? [{ ...blank(e.row.type), ...e.row }] : rs.length < 4 ? [...rs, { ...blank(e.row.type), ...e.row }] : rs))} className="rounded-full border px-2 py-0.5 text-xs hover:bg-muted">
              {e.label}
            </button>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            {rows.map((r, i) => (
              <div key={i} className="space-y-2 rounded-lg border p-2.5">
                <div className="flex items-center gap-2">
                  <span className="size-3 shrink-0 rounded-full" style={{ background: SERIES_COLORS[i % SERIES_COLORS.length] }} />
                  <div className="grid flex-1 grid-cols-2 gap-1 rounded-md bg-muted p-0.5 text-xs">
                    {(["fn", "points"] as const).map((t) => (
                      <button key={t} type="button" onClick={() => set(i, { type: t })} className={cn("rounded px-2 py-1", r.type === t ? "bg-background font-medium shadow-sm" : "text-muted-foreground")} aria-pressed={r.type === t}>
                        {t === "fn" ? "Function" : "Points"}
                      </button>
                    ))}
                  </div>
                  {rows.length > 1 && (
                    <Button size="icon-xs" variant="ghost" onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))} aria-label="Remove">
                      <Trash2 />
                    </Button>
                  )}
                </div>
                {r.type === "fn" ? (
                  <div className="flex items-center gap-2">
                    <span className="font-serif text-sm italic">y =</span>
                    <Input value={r.expr} onChange={(e) => set(i, { expr: e.target.value })} placeholder="2x + 1,  x^2 - 4,  sin(x)" aria-label={`Function ${i + 1}`} aria-invalid={!!r.expr && !!problems[i]} className="font-mono" />
                  </div>
                ) : (
                  <>
                    <Textarea value={r.points} onChange={(e) => set(i, { points: e.target.value })} placeholder={"(1, 2) (2, 4) (3, 6)\nor one x, y pair per line"} rows={3} aria-label={`Points ${i + 1}`} aria-invalid={!!r.points && !!problems[i]} className="font-mono text-sm" />
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                      <label className="flex items-center gap-1.5">
                        <Checkbox checked={r.join} onCheckedChange={(c) => set(i, { join: !!c })} /> Join the points
                      </label>
                      <label className="flex items-center gap-1.5">
                        <Checkbox checked={r.labels} onCheckedChange={(c) => set(i, { labels: !!c })} /> Show coordinates
                      </label>
                    </div>
                  </>
                )}
                {problems[i] && (r.expr || r.points) && <p className="text-xs text-destructive">{problems[i]}</p>}
              </div>
            ))}
            {rows.length < 4 && (
              <Button size="sm" variant="outline" onClick={() => setRows((rs) => [...rs, blank()])}>
                <Plus /> Add another
              </Button>
            )}
            <div className="space-y-2 rounded-lg border p-2.5 text-sm">
              <label className="flex items-center gap-2">
                <Checkbox checked={grid} onCheckedChange={(c) => setGrid(!!c)} /> Grid lines
              </label>
              <div className="flex items-center gap-2">
                <span className="shrink-0">Place on board</span>
                <div className="grid flex-1 grid-cols-3 gap-1 rounded-md bg-muted p-0.5 text-xs">
                  {(
                    [
                      ["left", "Left half"],
                      ["right", "Right half"],
                      ["full", "Whole board"],
                    ] as const
                  ).map(([k, label]) => (
                    <button key={k} type="button" onClick={() => setPlace(k)} className={cn("rounded px-1.5 py-1", where === k ? "bg-background font-medium shadow-sm" : "text-muted-foreground")} aria-pressed={where === k}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={auto}
                  onCheckedChange={(c) => {
                    if (!c && spec) setRange({ xMin: String(spec.xMin), xMax: String(spec.xMax), yMin: String(spec.yMin), yMax: String(spec.yMax) });
                    setAuto(!!c);
                  }}
                />
                Fit the axes automatically
              </label>
              {!auto && (
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      ["xMin", "x from"],
                      ["xMax", "x to"],
                      ["yMin", "y from"],
                      ["yMax", "y to"],
                    ] as const
                  ).map(([k, label]) => (
                    <label key={k} className="space-y-1 text-xs">
                      <span>{label}</span>
                      <Input numeric="signed" value={range[k]} onChange={(e) => setRange((r) => ({ ...r, [k]: e.target.value }))} />
                    </label>
                  ))}
                  {rangeProblem && <p className="col-span-2 text-xs text-destructive">{rangeProblem}</p>}
                </div>
              )}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">Preview</p>
            <canvas ref={preview} className="aspect-[4/3] w-full rounded-lg border bg-white" aria-label="Graph preview" />
            <p className="mt-1.5 text-xs text-muted-foreground">Use x, + − × ÷, ^ for powers, brackets, sin cos tan sqrt abs ln log exp, pi and e. 2x and 3(x+1) work too.</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!ready}
            onClick={() => {
              if (!spec) return;
              onInsert(spec, where);
              onOpenChange(false);
              setRows([blank()]);
            }}
          >
            <LineChart /> Put on the board
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
