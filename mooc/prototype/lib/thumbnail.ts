import type { Course } from "@/lib/types";

/**
 * Generated course covers (spec FR-TR-3). Every course has a 16:9 thumbnail
 * even before an instructor uploads one: a small SVG (well under 1 KB)
 * built from the course's subject and topic, so catalogue pages stay light on
 * slow, expensive data. Served from /thumbnails/<slug>.svg with long caching.
 */

type Theme = { from: string; to: string; ink: string; motif: (ink: string) => string };

const text = (t: string, size: number, ink: string, x = 470, y = 215) => `<text x="${x}" y="${y}" font-family="Georgia,serif" font-size="${size}" font-weight="700" fill="${ink}" text-anchor="middle" opacity=".9">${t}</text>`;

const MOTIFS: Record<string, Theme> = {
  maths: { from: "#0f766e", to: "#115e59", ink: "#ccfbf1", motif: (i) => `<path d="M330 300 Q470 20 610 300" fill="none" stroke="${i}" stroke-width="12" stroke-linecap="round"/><path d="M300 290 H640 M470 70 V320" stroke="${i}" stroke-width="4" opacity=".45"/>` },
  data: { from: "#1e3a8a", to: "#1d4ed8", ink: "#dbeafe", motif: (i) => [70, 140, 100, 190, 160].map((h, k) => `<rect x="${345 + k * 52}" y="${300 - h}" width="34" height="${h}" rx="6" fill="${i}" opacity="${0.55 + k * 0.09}"/>`).join("") },
  code: { from: "#312e81", to: "#4338ca", ink: "#e0e7ff", motif: (i) => text("&lt;/&gt;", 150, i) },
  science: { from: "#065f46", to: "#047857", ink: "#d1fae5", motif: (i) => `<g fill="none" stroke="${i}" stroke-width="7"><ellipse cx="470" cy="190" rx="130" ry="46"/><ellipse cx="470" cy="190" rx="130" ry="46" transform="rotate(60 470 190)"/><ellipse cx="470" cy="190" rx="130" ry="46" transform="rotate(-60 470 190)"/></g><circle cx="470" cy="190" r="16" fill="${i}"/>` },
  language: { from: "#9a3412", to: "#c2410c", ink: "#ffedd5", motif: (i) => text("Aa", 170, i) },
  humanities: { from: "#78350f", to: "#92400e", ink: "#fef3c7", motif: (i) => `<path d="M360 120 L470 70 L580 120 Z" fill="${i}"/>${[0, 1, 2, 3].map((k) => `<rect x="${372 + k * 55}" y="135" width="22" height="130" rx="4" fill="${i}" opacity=".85"/>`).join("")}<rect x="350" y="272" width="240" height="18" rx="4" fill="${i}"/>` },
  business: { from: "#14532d", to: "#166534", ink: "#dcfce7", motif: (i) => `<polyline points="340,280 400,230 450,250 520,160 600,110" fill="none" stroke="${i}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/><circle cx="600" cy="110" r="18" fill="${i}"/>` },
  arts: { from: "#86198f", to: "#a21caf", ink: "#fae8ff", motif: (i) => `<circle cx="430" cy="170" r="70" fill="${i}" opacity=".55"/><circle cx="510" cy="170" r="70" fill="${i}" opacity=".55"/><circle cx="470" cy="235" r="70" fill="${i}" opacity=".55"/>` },
  agriculture: { from: "#365314", to: "#4d7c0f", ink: "#ecfccb", motif: (i) => `<path d="M470 300 C470 220 470 180 470 120" stroke="${i}" stroke-width="8" fill="none"/><path d="M470 200 C400 200 370 150 380 100 C440 100 475 140 470 200 Z" fill="${i}"/><path d="M470 230 C540 230 575 185 565 135 C505 135 468 175 470 230 Z" fill="${i}" opacity=".8"/>` },
  technical: { from: "#334155", to: "#475569", ink: "#e2e8f0", motif: (i) => `<g stroke="${i}" stroke-width="3" opacity=".5">${[0, 1, 2, 3, 4, 5].map((k) => `<path d="M${340 + k * 52} 90 V300 M340 ${90 + k * 42} H600"/>`).join("")}</g><path d="M360 280 L580 110" stroke="${i}" stroke-width="12" stroke-linecap="round"/>` },
  health: { from: "#9f1239", to: "#be123c", ink: "#ffe4e6", motif: (i) => `<path d="M470 290 C350 220 360 120 430 120 C455 120 470 140 470 160 C470 140 485 120 510 120 C580 120 590 220 470 290 Z" fill="${i}"/>` },
  study: { from: "#0e7490", to: "#0891b2", ink: "#cffafe", motif: (i) => `<circle cx="470" cy="160" r="70" fill="none" stroke="${i}" stroke-width="10"/><path d="M445 240 H495 M450 262 H490" stroke="${i}" stroke-width="10" stroke-linecap="round"/><path d="M470 110 V160 L500 180" stroke="${i}" stroke-width="8" fill="none" stroke-linecap="round"/>` },
};

const SUBJECT_THEME: Record<string, keyof typeof MOTIFS> = {
  MATH: "maths", EMATH: "maths",
  PHY: "science", CHEM: "science", BIO: "science", ISCI: "science", AE: "technical",
  ICT: "code", COMP: "code",
  ENG: "language", LIT: "language", FRE: "language",
  HIST: "humanities", GOV: "humanities", SOC: "humanities", GEOG: "science",
  ECON: "business", BMGT: "business", FACC: "business", CACC: "business",
  GD: "arts", GKA: "arts", PM: "arts",
  GAGRIC: "agriculture", CROP: "agriculture", ANH: "agriculture",
  TD: "technical", BC: "technical",
  FN: "health", MIL: "health",
};

export function themeFor(course: Pick<Course, "subjects" | "topic" | "skills">): keyof typeof MOTIFS {
  const t = course.topic.toLowerCase();
  if (course.skills.some((s) => s.startsWith("sheet") || s.startsWith("sql") || s.startsWith("stats") || s === "data-story") || /statistic|data|spreadsheet|sql/.test(t)) return "data";
  if (course.skills.some((s) => s.startsWith("py")) || /program|artificial|network/.test(t)) return "code";
  if (/study/.test(t)) return "study";
  return (course.subjects.map((c) => SUBJECT_THEME[c]).find(Boolean) as keyof typeof MOTIFS | undefined) ?? "study";
}

/** A 640×360 SVG cover for a course. */
export function courseThumbnailSvg(course: Pick<Course, "slug" | "subjects" | "topic" | "skills">): string {
  const theme = MOTIFS[themeFor(course)]!;
  // A little per-course variety: the decoration circles move with the slug.
  let h = 0;
  for (const ch of course.slug) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const cx = 60 + (h % 180);
  const cy = 60 + ((h >> 8) % 240);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${theme.from}"/><stop offset="1" stop-color="${theme.to}"/></linearGradient></defs><rect width="640" height="360" fill="url(#g)"/><circle cx="${cx}" cy="${cy}" r="120" fill="${theme.ink}" opacity=".08"/><circle cx="${cx + 60}" cy="${cy + 40}" r="60" fill="${theme.ink}" opacity=".08"/>${theme.motif(theme.ink)}</svg>`;
}
