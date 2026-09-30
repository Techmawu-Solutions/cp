import { COURSES } from "@/lib/data/courses";
import type { Course } from "@/lib/types";

/**
 * Partner recommendations for ClassProject (spec sections 25.3–25.4). The same rules
 * back the API route (app/api/v1/partner/recommendations) and the in-app
 * landing page. Input is subject codes, a level and a language — never a
 * learner's identity.
 */

const LEVELS = ["BASIC1", "BASIC2", "BASIC3", "BASIC4", "BASIC5", "BASIC6", "JHS1", "JHS2", "JHS3", "SHS1", "SHS2", "SHS3"];
const rank = (l: string) => LEVELS.indexOf(l);

export const SUBJECT_NAMES: Record<string, string> = {
  ENG: "English Language", MATH: "Core Mathematics", EMATH: "Elective Mathematics", ISCI: "Integrated Science", SOC: "Social Studies", ICT: "ICT", COMP: "Computing",
  PHY: "Physics", CHEM: "Chemistry", BIO: "Biology", GOV: "Government", LIT: "Literature-in-English", ECON: "Economics", GEOG: "Geography", HIST: "History", FRE: "French",
  FACC: "Financial Accounting", BMGT: "Business Management", CACC: "Cost Accounting", FN: "Food & Nutrition", MIL: "Management in Living", GD: "Graphic Design",
  GKA: "General Knowledge in Art", PM: "Picture Making", GAGRIC: "General Agriculture", CROP: "Crop Husbandry", ANH: "Animal Husbandry", TD: "Technical Drawing", BC: "Building Construction", AE: "Applied Electricity",
};

export interface PartnerItem {
  slug: string;
  title: string;
  provider: string;
  level: Course["level"];
  hours: number;
  price: { free: boolean; amount?: number; currency?: string };
  offline: boolean;
  language: string;
  url: string;
  /** 16:9 cover image (spec FR-TR-3). */
  thumbnail_url: string;
  subjects: string[];
  reason: { code: "subject_match" | "exam_prep" | "next_level" | "interest_match"; subject: string; text: string };
}

export function partnerRecommendations({ subjects, level, limit = 12, baseUrl = "" }: { subjects: string[]; level?: string | null; limit?: number; baseUrl?: string }): PartnerItem[] {
  const lv = level ? rank(level) : -1;
  const scored: { c: Course; subject: string; score: number; examPrep: boolean }[] = [];
  for (const c of COURSES) {
    // Only secondary-friendly courses with free access may be recommended to 13–17s (spec section 25.4).
    if (!c.secondaryFriendly || c.minAge > 13 || !c.free) continue;
    const subject = c.subjects.find((s) => subjects.includes(s));
    if (!subject) continue;
    if (lv >= 0 && c.schoolLevels) {
      const [lo, hi] = [rank(c.schoolLevels[0]), rank(c.schoolLevels[1])];
      if (lv < lo - 1 || lv > hi) continue;
    }
    const examPrep = !!c.exam && lv >= rank(c.exam === "WASSCE" ? "SHS2" : "JHS2") && lv <= rank(c.exam === "WASSCE" ? "SHS3" : "JHS3");
    let score = 3 + (c.subjects[0] === subject ? 0.6 : 0) + (examPrep ? 0.4 : 0) + c.masteryRate / 200;
    if (c.authored) score += 0.3;
    scored.push({ c, subject, score, examPrep });
  }
  scored.sort((a, b) => b.score - a.score);
  // At most two per subject in the first six.
  const out: typeof scored = [];
  const later: typeof scored = [];
  const per = new Map<string, number>();
  for (const s of scored) {
    const n = per.get(s.subject) ?? 0;
    if (out.length < 6 && n >= 2) later.push(s);
    else {
      out.push(s);
      per.set(s.subject, n + 1);
    }
  }
  return [...out, ...later].slice(0, limit).map(({ c, subject, examPrep }) => {
    const name = SUBJECT_NAMES[subject] ?? subject;
    return {
      slug: c.slug,
      title: c.title,
      provider: c.provider,
      level: c.level,
      hours: c.hours,
      price: c.free ? { free: true } : { free: false, amount: c.priceGhs, currency: "GHS" },
      offline: c.offline,
      language: "en",
      url: `${baseUrl}/courses/${c.slug}`,
      thumbnail_url: c.thumbnail?.url ?? `${baseUrl}/thumbnails/${c.slug}.svg`,
      subjects: c.subjects,
      reason: examPrep
        ? { code: "exam_prep" as const, subject, text: `${c.exam} prep for ${name} — ${c.topic}` }
        : { code: "subject_match" as const, subject, text: `Matches ${name} — ${c.topic}` },
    };
  });
}
