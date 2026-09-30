"use client";

import type { PageBackground } from "@/lib/types";

/**
 * Draws a text lesson (the platform's lesson markup: "## heading",
 * "- bullet", **bold**) onto 16:9 page pictures, so it can be presented on
 * the board and written on, pointed at and zoomed like any document
 * (spec section 32.2). Long lessons flow onto as many pages as they need.
 */
const W = 1600;
const H = 900;
const MARGIN = 90;
const FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

type Block = { kind: "title" | "h" | "p" | "li"; text: string };

function blocks(title: string, body: string): Block[] {
  const out: Block[] = [{ kind: "title", text: title }];
  let para: string[] = [];
  const flush = () => {
    if (para.length) out.push({ kind: "p", text: para.join(" ") });
    para = [];
  };
  for (const raw of body.split("\n")) {
    const line = raw.trim().replace(/\*\*(.+?)\*\*/g, "$1");
    if (/^#{1,3} /.test(line) || /^[-*] /.test(line) || !line) flush();
    if (/^#{1,3} /.test(line)) out.push({ kind: "h", text: line.replace(/^#+ /, "") });
    else if (/^[-*] /.test(line)) out.push({ kind: "li", text: line.slice(2) });
    else if (line) para.push(line);
  }
  flush();
  return out;
}

const STYLE: Record<Block["kind"], { size: number; weight: number; gap: number; indent: number }> = {
  title: { size: 58, weight: 700, gap: 34, indent: 0 },
  h: { size: 42, weight: 700, gap: 26, indent: 0 },
  p: { size: 32, weight: 400, gap: 20, indent: 0 },
  li: { size: 32, weight: 400, gap: 10, indent: 44 },
};

function wrap(ctx: CanvasRenderingContext2D, text: string, width: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > width && line) {
      lines.push(line);
      line = word;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

export function lessonPages(title: string, body: string): PageBackground[] {
  const pages: PageBackground[] = [];
  let canvas: HTMLCanvasElement | null = null;
  let ctx: CanvasRenderingContext2D | null = null;
  let y = 0;
  const finish = () => {
    if (canvas) pages.push({ url: canvas.toDataURL("image/jpeg", 0.9), w: W, h: H, label: `${title} · page ${pages.length + 1}` });
  };
  const newPage = () => {
    finish();
    canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);
    ctx.textBaseline = "top";
    y = MARGIN;
  };
  newPage();
  for (const b of blocks(title, body)) {
    const st = STYLE[b.kind];
    const lineH = Math.round(st.size * 1.35);
    ctx!.font = `${st.weight} ${st.size}px ${FONT}`;
    const lines = wrap(ctx!, b.text, W - MARGIN * 2 - st.indent);
    lines.forEach((line, i) => {
      if (y + lineH > H - MARGIN) {
        newPage();
        ctx!.font = `${st.weight} ${st.size}px ${FONT}`;
      }
      ctx!.fillStyle = b.kind === "title" ? "#1d4ed8" : "#0f172a";
      if (b.kind === "li" && i === 0) ctx!.fillText("•", MARGIN + 8, y);
      ctx!.fillText(line, MARGIN + st.indent, y);
      y += lineH;
    });
    y += st.gap;
  }
  finish();
  return pages;
}
