"use client";

import type { PageBackground } from "@/lib/types";

/**
 * Turns a PDF or a picture into whiteboard page backgrounds, so teachers can
 * write on documents in class (spec §32 annotate PDFs). PDF pages are drawn
 * with pdf.js; tall (portrait) pages can be split into top and bottom halves,
 * which suit the 16:9 board better than a whole page.
 */

const MAX_W = 1600;

type PdfDoc = import("pdfjs-dist").PDFDocumentProxy;

export async function openPdf(source: ArrayBuffer | string): Promise<PdfDoc> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url).toString();
  return pdfjs.getDocument(typeof source === "string" ? { url: source } : { data: new Uint8Array(source) }).promise;
}

const jpeg = (c: HTMLCanvasElement) => c.toDataURL("image/jpeg", 0.85);

function crop(src: HTMLCanvasElement, y: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = src.width;
  c.height = Math.round(h);
  c.getContext("2d")!.drawImage(src, 0, Math.round(y), src.width, Math.round(h), 0, 0, src.width, Math.round(h));
  return c;
}

/**
 * Renders pages `from`–`to` (1-based). With `split`, each portrait page becomes
 * two backgrounds: its top and bottom halves (with a little overlap so no line
 * of text is cut in two).
 */
export async function pdfBackgrounds(doc: PdfDoc, opts: { from: number; to: number; split: boolean; name: string; onProgress?: (done: number, total: number) => void }): Promise<PageBackground[]> {
  const out: PageBackground[] = [];
  const total = opts.to - opts.from + 1;
  for (let n = opts.from; n <= opts.to; n++) {
    const page = await doc.getPage(n);
    const base = page.getViewport({ scale: 1 });
    const portrait = base.height > base.width;
    // Portrait pages that will be split are rendered a little wider, so each half is still sharp on the board.
    const scale = (portrait && opts.split ? MAX_W * 1.1 : MAX_W) / base.width;
    const vp = page.getViewport({ scale: Math.min(scale, 4) });
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(vp.width);
    canvas.height = Math.round(vp.height);
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport: vp, canvas }).promise;
    if (portrait && opts.split) {
      const half = canvas.height / 2;
      const overlap = canvas.height * 0.03;
      const top = crop(canvas, 0, half + overlap);
      const bottom = crop(canvas, half - overlap, half + overlap);
      out.push({ url: jpeg(top), w: top.width, h: top.height, label: `${opts.name} · page ${n} (top)` });
      out.push({ url: jpeg(bottom), w: bottom.width, h: bottom.height, label: `${opts.name} · page ${n} (bottom)` });
    } else {
      out.push({ url: jpeg(canvas), w: canvas.width, h: canvas.height, label: `${opts.name} · page ${n}` });
    }
    page.cleanup();
    opts.onProgress?.(n - opts.from + 1, total);
  }
  return out;
}

/** A picture (photo of a worksheet, diagram, screenshot) as a background, scaled down if very large. */
export async function imageBackground(src: Blob | string, name: string): Promise<PageBackground> {
  const url = typeof src === "string" ? src : URL.createObjectURL(src);
  const img = new Image();
  img.src = url;
  await img.decode();
  const scale = Math.min(1, MAX_W / img.naturalWidth, MAX_W / img.naturalHeight);
  const c = document.createElement("canvas");
  c.width = Math.round(img.naturalWidth * scale);
  c.height = Math.round(img.naturalHeight * scale);
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(img, 0, 0, c.width, c.height);
  if (typeof src !== "string") URL.revokeObjectURL(url);
  return { url: jpeg(c), w: c.width, h: c.height, label: name };
}
