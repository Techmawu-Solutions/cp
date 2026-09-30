"use client";

import type { Stroke } from "@/components/classroom/stage-sync";

/**
 * LaTeX on the whiteboard (spec section 32). MathJax turns LaTeX into plain SVG
 * shapes (no fonts, no HTML), which are drawn onto the board canvas as
 * images — so equations look the same on every screen and are kept when the
 * board is saved as an image. MathJax is loaded only when a board uses maths.
 */

type Doc = { convert: (tex: string, opts: { display: boolean }) => unknown };
type Adaptor = { innerHTML: (node: unknown) => string };

let engine: Promise<{ doc: Doc; adaptor: Adaptor }> | null = null;

function loadEngine() {
  engine ??= (async () => {
    const [{ mathjax }, { TeX }, { SVG }, { liteAdaptor }, { RegisterHTMLHandler }, { AllPackages }] = await Promise.all([
      import("mathjax-full/js/mathjax.js"),
      import("mathjax-full/js/input/tex.js"),
      import("mathjax-full/js/output/svg.js"),
      import("mathjax-full/js/adaptors/liteAdaptor.js"),
      import("mathjax-full/js/handlers/html.js"),
      import("mathjax-full/js/input/tex/AllPackages.js"),
    ]);
    const adaptor = liteAdaptor();
    RegisterHTMLHandler(adaptor);
    // No "html" package: \href, \style and friends aren't needed on a whiteboard.
    const packages = AllPackages.filter((p: string) => p !== "html");
    const doc = mathjax.document("", { InputJax: new TeX({ packages }), OutputJax: new SVG({ fontCache: "none" }) }) as unknown as Doc;
    return { doc, adaptor: adaptor as unknown as Adaptor };
  })();
  return engine;
}

/** Size of the rendered formula in ex; the board scales ex to its text size. */
export interface MathAsset {
  img: HTMLImageElement;
  url: string;
  wEx: number;
  hEx: number;
  error: string | null;
}

/** LaTeX → SVG image, coloured. Errors (e.g. a missing brace) are reported, and MathJax still shows what it could. */
export async function renderMath(tex: string, color: string): Promise<MathAsset> {
  const { doc, adaptor } = await loadEngine();
  let svg = adaptor.innerHTML(doc.convert(tex, { display: true }));
  const error = /data-mjx-error="([^"]*)"/.exec(svg)?.[1] ?? null;
  const wEx = Number(/width="([\d.]+)ex"/.exec(svg)?.[1] ?? 1);
  const hEx = Number(/height="([\d.]+)ex"/.exec(svg)?.[1] ?? 1);
  // Fixed pixel size (8 px per ex) and the chosen colour; the board scales it when drawing.
  svg = svg
    .replace(/currentColor/g, color)
    .replace(/width="[\d.]+ex"/, `width="${wEx * 8}"`)
    .replace(/height="[\d.]+ex"/, `height="${hEx * 8}"`)
    .replace(/ style="[^"]*"/, "");
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  const img = new Image();
  img.src = url;
  await img.decode().catch(() => {});
  return { img, url, wEx, hEx, error };
}

const cache = new Map<string, MathAsset | Promise<MathAsset>>();
const key = (tex: string, color: string) => `${color}\u0000${tex}`;

/** A formula ready to draw, or null while it's being prepared (`onReady` is called once it is). */
export function mathAsset(tex: string, color: string, onReady?: () => void): MathAsset | null {
  const k = key(tex, color);
  const hit = cache.get(k);
  if (hit && !(hit instanceof Promise)) return hit;
  if (!hit) {
    const p = renderMath(tex, color).then((a) => (cache.set(k, a), a));
    cache.set(k, p);
    if (onReady) void p.then(onReady);
  } else if (onReady) void hit.then(onReady);
  return null;
}

/** Waits until every formula on a board is ready — before saving the board as an image. */
export async function prepareBoardMath(strokes: Stroke[]) {
  await Promise.all(
    strokes
      .filter((s) => s.kind === "math" && s.tex)
      .map((s) => {
        const k = key(s.tex!, s.color);
        const hit = cache.get(k);
        return hit ?? renderMath(s.tex!, s.color).then((a) => cache.set(k, a));
      }),
  );
}

/**
 * Text typed with $…$ becomes one formula with the words kept as text:
 * "Speed $v = \frac{d}{t}$" → \text{Speed }v = \frac{d}{t}. Null when there's no maths.
 */
export function textToTex(text: string): string | null {
  const parts = text.split(/\$\$?/);
  if (parts.length < 3) return null;
  // Words go inside \text{…}: backslashes are dropped and TeX's special characters escaped.
  const esc = (t: string) => t.replace(/\\/g, "").replace(/[{}#%&_]/g, (c) => `\\${c}`);
  return parts.map((p, i) => (i % 2 ? p : p ? `\\text{${esc(p)}}` : "")).join("");
}
