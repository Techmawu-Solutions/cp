import { imageToDataUrl } from "@/lib/images";

/**
 * School branding colours (spec §5.2). A school picks a primary colour and,
 * optionally, a sidebar colour; everything else — text on those colours,
 * hover tints, the dark-mode variant — is derived here so any choice stays
 * readable. The values are written as CSS variables that globals.css maps
 * onto the theme tokens.
 */

export const BRAND_PRESETS: { name: string; hex: string }[] = [
  { name: "ClassProject blue", hex: "#2563eb" },
  { name: "Navy", hex: "#1e3a8a" },
  { name: "Forest green", hex: "#15803d" },
  { name: "Teal", hex: "#0f766e" },
  { name: "Maroon", hex: "#9f1239" },
  { name: "Purple", hex: "#6d28d9" },
  { name: "Orange", hex: "#c2410c" },
  { name: "Gold", hex: "#a16207" },
];

export const isHex = (s: string | undefined): s is string => !!s && /^#[0-9a-f]{6}$/i.test(s);

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const toHex = (c: number[]) => `#${c.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("")}`;

/** Blend `a` towards `b` by `t` (0 = a, 1 = b). */
export function mix(a: string, b: string, t: number): string {
  const x = rgb(a);
  const y = rgb(b);
  return toHex(x.map((v, i) => v + (y[i]! - v) * t));
}

/** WCAG relative luminance. */
export function luminance(hex: string): number {
  const [r, g, b] = rgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

export const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
};

const INK = "#0f172a";
const WHITE = "#ffffff";

/** White or near-black, whichever reads better on `bg`. */
export const readableOn = (bg: string) => (contrast(bg, WHITE) >= contrast(bg, INK) ? WHITE : INK);

/** CSS variables for a school's branding; empty when it uses the defaults. */
export function brandVars(branding: { primary?: string; sidebar?: string } | undefined): Record<string, string> {
  const vars: Record<string, string> = {};
  const p = branding?.primary;
  if (isHex(p)) {
    // Dark mode lifts very dark colours so buttons don't sink into the background.
    const pd = luminance(p) < 0.12 ? mix(p, WHITE, 0.35) : p;
    Object.assign(vars, {
      "--brand": p,
      "--brand-fg": readableOn(p),
      "--brand-dark": pd,
      "--brand-dark-fg": readableOn(pd),
      "--brand-soft": mix(p, WHITE, 0.9),
      "--brand-soft-fg": mix(p, INK, 0.35),
      "--brand-soft-dark": mix(p, "#161b26", 0.78),
      "--brand-soft-dark-fg": mix(p, WHITE, 0.75),
    });
  }
  const s = branding?.sidebar;
  if (isHex(s)) {
    const fg = readableOn(s);
    Object.assign(vars, {
      "--brand-sidebar": s,
      "--brand-sidebar-fg": fg,
      "--brand-sidebar-muted": mix(s, fg, 0.62),
      "--brand-sidebar-accent": mix(s, fg, 0.12),
      "--brand-sidebar-border": mix(s, fg, 0.16),
    });
  }
  return vars;
}

/**
 * The most prominent saturated colour in an image — used to suggest a
 * primary colour that matches an uploaded logo. Returns null for greyscale logos.
 */
export async function logoColour(dataUrl: string): Promise<string | null> {
  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  const size = 48;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, size, size);
  const { data } = ctx.getImageData(0, 0, size, size);
  const buckets = new Map<string, { n: number; r: number; g: number; b: number }>();
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b, a] = [data[i]!, data[i + 1]!, data[i + 2]!, data[i + 3]!];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (a < 200 || max - min < 40 || max < 40 || min > 225) continue; // skip transparent, grey, near-black and near-white
    const key = `${r >> 5}-${g >> 5}-${b >> 5}`;
    const e = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    buckets.set(key, { n: e.n + 1, r: e.r + r, g: e.g + g, b: e.b + b });
  }
  const top = [...buckets.values()].sort((a, b) => b.n - a.n)[0];
  return top ? toHex([top.r / top.n, top.g / top.n, top.b / top.n]) : null;
}

/** Shrinks an uploaded logo to at most 256px and returns it as a data URL (SVGs are kept as they are). */
export const logoToDataUrl = (file: File) => imageToDataUrl(file, 256);
