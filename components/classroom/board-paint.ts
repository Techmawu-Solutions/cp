import { compileExpression, fmtTick, niceStep, seriesLabel, type GraphSpec } from "@/lib/graph-math";
import type { PageBackground, Stroke } from "@/lib/types";
import { mathAsset } from "@/components/classroom/board-math";

/**
 * Draws whiteboard items (spec §32): pen strokes, shapes, text and graphs.
 * Everything is described in board coordinates and redrawn at the canvas's
 * size, so every screen — and the saved image — shows the same board.
 */

export const BOARD_BG = "#ffffff";

export const textPx = (size: number, w: number) => ((size * 3 + 12) * w) / 1000;

const images = new Map<string, HTMLImageElement>();

/** A page background image, or null while it loads (`onReady` is called once it has). */
function backgroundImage(url: string, onReady?: () => void): HTMLImageElement | null {
  let img = images.get(url);
  if (!img) {
    img = new Image();
    img.src = url;
    images.set(url, img);
  }
  if (img.complete && img.naturalWidth) return img;
  if (onReady) img.addEventListener("load", onReady, { once: true });
  return null;
}

/** Waits until page backgrounds are loaded — before saving pages as images. */
export async function prepareBackgrounds(backgrounds: (PageBackground | undefined)[]) {
  await Promise.all(
    backgrounds
      .filter((b): b is PageBackground => !!b)
      .map((b) => {
        const img = images.get(b.url) ?? (backgroundImage(b.url), images.get(b.url)!);
        return img.decode().catch(() => {});
      }),
  );
}

/** Where a background sits on a w × h board: as large as fits, centred. */
export function backgroundRect(bg: Pick<PageBackground, "w" | "h">, w: number, h: number) {
  const scale = Math.min(w / bg.w, h / bg.h);
  const bw = bg.w * scale;
  const bh = bg.h * scale;
  return { x: (w - bw) / 2, y: (h - bh) / 2, w: bw, h: bh };
}

// Annotations are painted on their own layer, so the eraser and highlighter never touch the page underneath.
let layer: HTMLCanvasElement | null = null;

/**
 * Paints a page: its background (e.g. a PDF page), then the annotations.
 * `onAsset` is called when a formula or background that wasn't ready yet has
 * loaded, so the board can redraw.
 */
export function paintStrokes(ctx: CanvasRenderingContext2D, strokes: Stroke[], w: number, h: number, onAsset?: () => void, background?: PageBackground) {
  ctx.fillStyle = BOARD_BG;
  ctx.fillRect(0, 0, w, h);
  if (background) {
    const img = backgroundImage(background.url, onAsset);
    const r = backgroundRect(background, w, h);
    if (img) ctx.drawImage(img, r.x, r.y, r.w, r.h);
    else {
      ctx.fillStyle = "#f1f5f9";
      ctx.fillRect(r.x, r.y, r.w, r.h);
    }
    // A thin edge shows where the document page is on the board.
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 1;
    ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
  }
  const needsLayer = !!background || strokes.some((s) => s.eraser || s.highlight);
  if (!needsLayer || typeof document === "undefined") {
    for (const s of strokes) paintStroke(ctx, s, w, h, onAsset);
    return;
  }
  layer ??= document.createElement("canvas");
  if (layer.width !== w || layer.height !== h) {
    layer.width = w;
    layer.height = h;
  }
  const lc = layer.getContext("2d")!;
  lc.clearRect(0, 0, w, h);
  for (const s of strokes) paintStroke(lc, s, w, h, onAsset);
  ctx.drawImage(layer, 0, 0);
}

/** Pixel size of a formula on a board `w` px wide (MathJax measures in ex; one ex is about half the text size). */
export function mathBox(s: Pick<Stroke, "size">, asset: { wEx: number; hEx: number }, w: number) {
  const ex = textPx(s.size, w) * 0.55;
  return { width: asset.wEx * ex, height: asset.hEx * ex };
}

export function paintStroke(ctx: CanvasRenderingContext2D, s: Stroke, w: number, h: number, onAsset?: () => void) {
  const kind = s.kind ?? "pen";
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = s.eraser ? BOARD_BG : s.color;
  ctx.fillStyle = s.color;
  ctx.lineWidth = Math.max(1, (s.size * w) / 1000);
  // On an annotation layer the eraser removes ink (it never paints over the page underneath).
  if (s.eraser) ctx.globalCompositeOperation = "destination-out";
  if (s.highlight) {
    ctx.globalAlpha = 0.35;
    ctx.lineCap = "butt";
  }
  const [x0 = 0, y0 = 0, x1 = 0, y1 = 0] = s.pts.map((v, i) => v * (i % 2 ? h : w));
  if (kind === "pen") {
    if (s.pts.length >= 2) {
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      if (s.pts.length === 2) ctx.lineTo(x0 + 0.01, y0);
      for (let i = 2; i < s.pts.length; i += 2) ctx.lineTo(s.pts[i]! * w, s.pts[i + 1]! * h);
      ctx.stroke();
    }
  } else if (kind === "line" || kind === "arrow") {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    if (kind === "arrow" && (x1 !== x0 || y1 !== y0)) {
      const a = Math.atan2(y1 - y0, x1 - x0);
      const head = Math.max(10, ctx.lineWidth * 4);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x1 - head * Math.cos(a - 0.45), y1 - head * Math.sin(a - 0.45));
      ctx.lineTo(x1 - head * Math.cos(a + 0.45), y1 - head * Math.sin(a + 0.45));
      ctx.closePath();
      ctx.fill();
    }
  } else if (kind === "rect") {
    ctx.strokeRect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0));
  } else if (kind === "ellipse") {
    ctx.beginPath();
    ctx.ellipse((x0 + x1) / 2, (y0 + y1) / 2, Math.abs(x1 - x0) / 2, Math.abs(y1 - y0) / 2, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else if (kind === "triangle") {
    ctx.beginPath();
    ctx.moveTo((x0 + x1) / 2, Math.min(y0, y1));
    ctx.lineTo(Math.max(x0, x1), Math.max(y0, y1));
    ctx.lineTo(Math.min(x0, x1), Math.max(y0, y1));
    ctx.closePath();
    ctx.stroke();
  } else if (kind === "text" && s.text) {
    const px = textPx(s.size, w);
    ctx.font = `500 ${px}px ui-sans-serif, system-ui, sans-serif`;
    ctx.textBaseline = "top";
    s.text.split("\n").forEach((line, i) => ctx.fillText(line, x0, y0 + i * px * 1.25));
  } else if (kind === "math" && s.tex) {
    const asset = mathAsset(s.tex, s.color, onAsset);
    if (asset) {
      const { width, height } = mathBox(s, asset, w);
      ctx.drawImage(asset.img, x0, y0, width, height);
    } else {
      // Still preparing (MathJax loads the first time): a light placeholder.
      ctx.globalAlpha = 0.4;
      ctx.font = `italic ${textPx(s.size, w)}px ui-serif, Georgia, serif`;
      ctx.textBaseline = "top";
      ctx.fillText("∑ …", x0, y0);
    }
  } else if (kind === "graph" && s.graph) {
    paintGraph(ctx, s.graph, x0, y0, s.pts[2]! * w, s.pts[3]! * h, w / 1000);
  }
  ctx.restore();
}

/** Axes, grid, tick labels, plotted functions and points, and a key — inside the box (x, y, gw, gh). */
export function paintGraph(ctx: CanvasRenderingContext2D, g: GraphSpec, x: number, y: number, gw: number, gh: number, scale: number) {
  const { xMin, xMax, yMin, yMax } = g;
  if (!(xMax > xMin) || !(yMax > yMin)) return;
  const font = Math.max(10, gh * 0.034);
  const pad = { l: font * 3.2, r: font * 1.2, t: font * 1, b: font * 2.2 };
  const L = x + pad.l;
  const R = x + gw - pad.r;
  const T = y + pad.t;
  const B = y + gh - pad.b;
  const px = (v: number) => L + ((v - xMin) / (xMax - xMin)) * (R - L);
  const py = (v: number) => B - ((v - yMin) / (yMax - yMin)) * (B - T);
  const sx = niceStep(xMax - xMin, 10);
  const sy = niceStep(yMax - yMin, 8);
  const ticks = (lo: number, hi: number, step: number) => {
    const out: number[] = [];
    for (let v = Math.ceil(lo / step) * step; v <= hi + step * 1e-9; v += step) out.push(Math.round(v / step) * step);
    return out;
  };

  // No background: anything already drawn under the graph stays visible.
  ctx.save();
  ctx.lineCap = "butt";
  // Grid
  if (g.grid) {
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = Math.max(1, scale);
    ctx.beginPath();
    for (const v of ticks(xMin, xMax, sx)) {
      ctx.moveTo(px(v), T);
      ctx.lineTo(px(v), B);
    }
    for (const v of ticks(yMin, yMax, sy)) {
      ctx.moveTo(L, py(v));
      ctx.lineTo(R, py(v));
    }
    ctx.stroke();
  }
  // Axes sit on 0 when it's in range, otherwise on the edge.
  const ax = yMin <= 0 && yMax >= 0 ? py(0) : B;
  const ay = xMin <= 0 && xMax >= 0 ? px(0) : L;
  ctx.strokeStyle = "#334155";
  ctx.fillStyle = "#334155";
  ctx.lineWidth = Math.max(1.5, 1.6 * scale);
  ctx.beginPath();
  ctx.moveTo(L, ax);
  ctx.lineTo(R, ax);
  ctx.moveTo(ay, B);
  ctx.lineTo(ay, T);
  ctx.stroke();
  // Tick labels
  ctx.font = `${font}px ui-sans-serif, system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  for (const v of ticks(xMin, xMax, sx)) {
    if (Math.abs(v) < sx / 2 && ay !== L) continue;
    ctx.beginPath();
    ctx.moveTo(px(v), ax - font * 0.25);
    ctx.lineTo(px(v), ax + font * 0.25);
    ctx.stroke();
    ctx.fillText(fmtTick(v), px(v), Math.min(ax + font * 0.4, B + font * 0.4));
  }
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (const v of ticks(yMin, yMax, sy)) {
    if (Math.abs(v) < sy / 2 && ax !== B) continue;
    ctx.beginPath();
    ctx.moveTo(ay - font * 0.25, py(v));
    ctx.lineTo(ay + font * 0.25, py(v));
    ctx.stroke();
    ctx.fillText(fmtTick(v), Math.max(ay - font * 0.4, L - font * 0.4), py(v));
  }
  if (ay !== L && ax !== B) {
    ctx.textAlign = "right";
    ctx.textBaseline = "top";
    ctx.fillText("0", ay - font * 0.3, ax + font * 0.3);
  }
  // Axis names
  ctx.font = `italic ${font * 1.1}px ui-serif, Georgia, serif`;
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.fillText("x", R, ax - font * 0.3);
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("y", ay + font * 0.4, T);

  // Series, clipped to the plot area
  ctx.save();
  ctx.beginPath();
  ctx.rect(L, T, R - L, B - T);
  ctx.clip();
  for (const s of g.series) {
    ctx.strokeStyle = s.color;
    ctx.fillStyle = s.color;
    ctx.lineWidth = Math.max(2, 2.6 * scale);
    ctx.lineJoin = "round";
    if (s.type === "fn") {
      let f: (v: number) => number;
      try {
        f = compileExpression(s.expr);
      } catch {
        continue;
      }
      const n = Math.max(200, Math.round(R - L));
      ctx.beginPath();
      let pen = false;
      let lastY = 0;
      for (let i = 0; i <= n; i++) {
        const vx = xMin + ((xMax - xMin) * i) / n;
        const vy = f(vx);
        const cy = py(vy);
        // Lift the pen at gaps (sqrt of negatives) and asymptotes (1/x) instead of joining across them.
        if (!Number.isFinite(vy) || Math.abs(cy - T) > (B - T) * 20 || (pen && Math.abs(cy - lastY) > (B - T) * 1.5)) {
          pen = false;
          continue;
        }
        if (pen) ctx.lineTo(px(vx), cy);
        else ctx.moveTo(px(vx), cy);
        pen = true;
        lastY = cy;
      }
      ctx.stroke();
    } else {
      if (s.join && s.points.length > 1) {
        ctx.beginPath();
        s.points.forEach(([vx, vy], i) => (i ? ctx.lineTo(px(vx), py(vy)) : ctx.moveTo(px(vx), py(vy))));
        ctx.stroke();
      }
      const r = Math.max(3.5, 4.5 * scale);
      for (const [vx, vy] of s.points) {
        ctx.beginPath();
        ctx.arc(px(vx), py(vy), r, 0, Math.PI * 2);
        ctx.fill();
      }
      if (s.labels) {
        ctx.font = `${font * 0.95}px ui-sans-serif, system-ui, sans-serif`;
        ctx.textAlign = "left";
        ctx.textBaseline = "bottom";
        for (const [vx, vy] of s.points) {
          const label = `(${fmtTick(vx)}, ${fmtTick(vy)})`;
          // Labels near the right edge go on the left of the point so they aren't cut off.
          const right = px(vx) + r * 1.4 + ctx.measureText(label).width <= R;
          ctx.textAlign = right ? "left" : "right";
          ctx.fillText(label, right ? px(vx) + r * 1.4 : px(vx) - r * 1.4, py(vy) - r * 0.6);
        }
      }
    }
  }
  ctx.restore();

  // Key
  ctx.font = `${font}px ui-sans-serif, system-ui, sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  const labels = g.series.map(seriesLabel);
  const kw = Math.max(0, ...labels.map((l) => ctx.measureText(l).width)) + font * 2.4;
  const kh = labels.length * font * 1.4 + font * 0.6;
  const kx = L + font * 0.6;
  const ky = T + font * 0.3;
  if (labels.length) {
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fillRect(kx, ky, kw, kh);
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 1;
    ctx.strokeRect(kx, ky, kw, kh);
    g.series.forEach((s, i) => {
      const cy = ky + font * 0.3 + font * 1.4 * i + font * 0.7;
      ctx.fillStyle = s.color;
      ctx.fillRect(kx + font * 0.5, cy - font * 0.12, font * 1.2, font * 0.24);
      ctx.fillStyle = "#0f172a";
      ctx.fillText(labels[i]!, kx + font * 1.9, cy);
    });
  }
  ctx.restore();
}

/** A whiteboard page as a PNG data URL (for saving to the course or downloading). */
export function boardImage(strokes: Stroke[], width = 1600, type: "image/png" | "image/jpeg" = "image/png", background?: PageBackground): string {
  const c = document.createElement("canvas");
  c.width = width;
  c.height = Math.round((width * 9) / 16);
  paintStrokes(c.getContext("2d")!, strokes, c.width, c.height, undefined, background);
  return c.toDataURL(type, 0.92);
}
