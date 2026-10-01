import { CATALOGUE_SUBJECTS } from "@/lib/data/catalogue";
import type { Subject } from "@/lib/types";

/**
 * ClassProject Open — the separate global MOOC platform (its own repo, cpopen) —
 * and the one link to it: subject-based course recommendations for students
 * (spec section 49.2; Open spec section 25).
 *
 * In production ClassProject calls Open's signed partner API with the
 * student's catalogue subject codes and level only — never who the student is —
 * and caches the answer for 24 h. Until that API exists, this file is a mock of
 * Open's catalogue and applies the same matching rules (Open spec section 25.4).
 */

export const MOOC_NAME = "ClassProject Open";
/**
 * Where Open lives. In development it's the clickable prototype in
 * cpopen/prototype (`npm run dev` there serves it on port 3001); set
 * NEXT_PUBLIC_MOOC_URL to point a deployment at a hosted copy.
 */
export const MOOC_URL = process.env.NEXT_PUBLIC_MOOC_URL ?? (process.env.NODE_ENV === "development" ? "http://localhost:3001" : "https://open.classproject.com");

export interface MoocCourse {
  id: string;
  slug: string;
  title: string;
  provider: string;
  summary: string;
  /** ClassProject catalogue subject codes the course serves (spec section 17.1). */
  subjects: string[];
  /** Topic inside the subject, used in the reason ("Elective Mathematics — quadratic functions"). */
  topic: string;
  /** Lowest and highest school level it suits: BASIC1–BASIC6, JHS1–JHS3, SHS1–SHS3. */
  levels: [string, string];
  level: "beginner" | "intermediate" | "advanced";
  hours: number;
  free: boolean;
  offline: boolean;
  /** Download size for offline use, MB. */
  sizeMb: number;
  /** Exam it prepares for, if any. */
  exam?: "WASSCE" | "BECE";
  /** Goes beyond the school syllabus (reason "next level"). */
  beyond?: boolean;
  outline: string[];
}

const C = (
  id: string,
  title: string,
  provider: string,
  subjects: string[],
  topic: string,
  levels: [string, string],
  level: MoocCourse["level"],
  hours: number,
  summary: string,
  outline: string[],
  opts: Partial<Pick<MoocCourse, "free" | "offline" | "sizeMb" | "exam" | "beyond">> = {},
): MoocCourse => ({
  id: `mooc_${id}`,
  slug: id,
  title,
  provider,
  subjects,
  topic,
  levels,
  level,
  hours,
  summary,
  outline,
  free: opts.free ?? true,
  offline: opts.offline ?? true,
  sizeMb: opts.sizeMb ?? Math.round(hours * 38),
  exam: opts.exam,
  beyond: opts.beyond,
});

/** Mock Open catalogue — secondary-friendly courses only (Open spec section 25.4). */
export const MOOC_CATALOGUE: MoocCourse[] = [
  // Mathematics
  C("quadratic-functions-made-visual", "Quadratic Functions, Made Visual", "KNUST Mathematics", ["EMATH", "MATH"], "quadratic functions", ["SHS1", "SHS3"], "intermediate", 6, "See what a, b and c do to a parabola, then solve real problems with graphs and the formula.", ["Graphs of y = ax² + bx + c", "Completing the square", "The quadratic formula", "Word problems"], { exam: "WASSCE" }),
  C("wassce-core-maths-sprint", "WASSCE Core Maths Sprint", "ClassProject Open", ["MATH"], "exam practice", ["SHS2", "SHS3"], "intermediate", 12, "Past-question practice by topic with worked solutions and a spaced-review plan up to exam day.", ["Number & numeration", "Algebra", "Geometry & mensuration", "Statistics & probability"], { exam: "WASSCE" }),
  C("fractions-to-percentages", "From Fractions to Percentages", "Accra Maths Circle", ["MATH"], "fractions and percentages", ["JHS1", "SHS1"], "beginner", 4, "Build confidence with fractions, decimals and percentages using market-day examples.", ["Equivalent fractions", "Decimals", "Percentages", "Profit and loss"], { exam: "BECE" }),
  C("calculus-first-steps", "Calculus: First Steps", "University of Ghana", ["EMATH"], "differentiation", ["SHS2", "SHS3"], "advanced", 10, "Limits, rates of change and derivatives — the ideas behind them, not just the rules.", ["Rates of change", "Limits", "Derivatives", "Applications"], { beyond: true }),
  C("statistics-in-everyday-life", "Statistics in Everyday Life", "Ashesi University", ["MATH", "EMATH", "ECON"], "statistics", ["SHS1", "SHS3"], "beginner", 5, "Averages, spread and charts with real Ghanaian data — and how numbers can mislead.", ["Collecting data", "Averages", "Spread", "Reading charts critically"]),
  // Sciences
  C("forces-and-motion-labs", "Forces and Motion — Virtual Labs", "KNUST Physics", ["PHY", "ISCI"], "forces and motion", ["SHS1", "SHS3"], "intermediate", 7, "Run virtual experiments on speed, acceleration and Newton's laws, then explain what you saw.", ["Speed and velocity", "Acceleration", "Newton's laws", "Momentum"], { exam: "WASSCE" }),
  C("electricity-at-home", "Electricity at Home", "ClassProject Open", ["PHY", "AE", "ISCI"], "circuits", ["JHS3", "SHS3"], "beginner", 4, "Current, voltage and resistance through the wiring in your own house — safely.", ["Circuits", "Ohm's law", "Power and bills", "Safety"]),
  C("chemistry-of-the-kitchen", "The Chemistry of the Kitchen", "University of Cape Coast", ["CHEM", "ISCI", "FN"], "reactions", ["SHS1", "SHS3"], "beginner", 5, "Acids, bases and reactions you can see while cooking.", ["Acids and bases", "Reactions", "Mixtures", "Food chemistry"]),
  C("organic-chemistry-essentials", "Organic Chemistry Essentials", "KNUST Chemistry", ["CHEM"], "organic chemistry", ["SHS2", "SHS3"], "advanced", 9, "Hydrocarbons, functional groups and naming — with 3D models you can turn.", ["Hydrocarbons", "Functional groups", "Naming", "Reactions"], { exam: "WASSCE" }),
  C("cells-genes-and-you", "Cells, Genes and You", "Noguchi Memorial Institute", ["BIO", "ISCI"], "cells and genetics", ["SHS1", "SHS3"], "intermediate", 6, "From cells to DNA to inheritance — with malaria and sickle-cell as case studies.", ["Cells", "DNA", "Inheritance", "Health case studies"]),
  C("climate-and-ecosystems", "Climate and Ecosystems of West Africa", "University of Ghana", ["BIO", "GEOG", "GAGRIC"], "ecosystems", ["JHS2", "SHS3"], "beginner", 5, "Savannah, forest and coast: how climate shapes life and farming.", ["Ecosystems", "Climate", "Human impact", "Adapting"]),
  // Computing
  C("python-for-beginners", "Python for Beginners", "ClassProject Open", ["ICT", "COMP"], "programming", ["JHS2", "SHS3"], "beginner", 8, "Write your first programs on a phone or laptop — games, quizzes and calculators.", ["Variables", "Decisions", "Loops", "Your first project"], { beyond: true }),
  C("spreadsheets-that-think", "Spreadsheets That Think", "Ghana Tech Lab", ["ICT", "FACC", "BMGT"], "spreadsheets", ["SHS1", "SHS3"], "beginner", 5, "Formulas, charts and budgets in spreadsheets — skills every job asks for.", ["Formulas", "Functions", "Charts", "A budget project"]),
  C("how-the-internet-works", "How the Internet Works", "ClassProject Open", ["ICT"], "networks", ["JHS1", "SHS3"], "beginner", 3, "Packets, addresses and staying safe online.", ["Packets", "Addresses", "The web", "Online safety"]),
  C("intro-to-ai", "Introduction to Artificial Intelligence", "Ashesi University", ["COMP", "ICT"], "artificial intelligence", ["SHS2", "SHS3"], "intermediate", 6, "What AI can and can't do, how it learns from data, and how to use it responsibly.", ["What is AI?", "Learning from data", "Using AI tools well", "AI and society"], { beyond: true }),
  // English and languages
  C("writing-that-works", "Writing That Works", "University of Cape Coast", ["ENG", "LIT"], "essay writing", ["JHS2", "SHS3"], "intermediate", 6, "Plan, draft and edit essays and letters that examiners — and employers — want to read.", ["Planning", "Paragraphs", "Letters and reports", "Editing"], { exam: "WASSCE" }),
  C("reading-african-literature", "Reading African Literature", "University of Ghana", ["LIT", "ENG"], "literature", ["SHS1", "SHS3"], "intermediate", 7, "Achebe, Aidoo, Ngũgĩ and more — themes, context and how to write about them.", ["Novel", "Drama", "Poetry", "Writing about texts"]),
  C("french-for-everyday", "French for Everyday Conversations", "Alliance Française Accra", ["FRE"], "conversation", ["JHS1", "SHS3"], "beginner", 8, "Speak French at the market, on the phone and with neighbours across the border.", ["Greetings", "Shopping", "Travel", "Phone calls"], { sizeMb: 180 }),
  // Humanities and business
  C("ghana-history-independence", "Ghana: The Road to Independence", "University of Ghana", ["HIST", "SOC", "GOV"], "independence", ["JHS2", "SHS3"], "beginner", 4, "The people, events and ideas that led to 6 March 1957.", ["Colonial Gold Coast", "Nationalism", "1948 and after", "Independence"]),
  C("how-government-works", "How Government Works", "Ghana Institute of Journalism", ["GOV", "SOC"], "government", ["SHS1", "SHS3"], "beginner", 4, "The constitution, elections and your rights as a citizen.", ["The constitution", "Arms of government", "Elections", "Citizenship"]),
  C("money-and-markets", "Money and Markets", "Ashesi University", ["ECON", "BMGT"], "markets", ["SHS1", "SHS3"], "beginner", 5, "Demand, supply and prices — explained with trotro fares and cedi exchange rates.", ["Demand and supply", "Prices", "Money", "Inflation"]),
  C("bookkeeping-basics", "Bookkeeping Basics", "ICAG Academy", ["FACC", "CACC", "BMGT"], "bookkeeping", ["SHS1", "SHS3"], "beginner", 6, "Double entry, ledgers and trial balance — then keep the books for a small shop.", ["Double entry", "Ledgers", "Trial balance", "A shop's books"], { exam: "WASSCE" }),
  C("start-a-small-business", "Start a Small Business", "Ghana Enterprise Agency", ["BMGT", "ECON", "SOC"], "entrepreneurship", ["SHS2", "SHS3"], "beginner", 5, "From idea to first customers — with a business plan you can actually use.", ["Ideas", "Customers", "Costs and pricing", "Your plan"], { beyond: true }),
  // Arts, agriculture, technical
  C("design-thinking-for-creatives", "Design Thinking for Creatives", "KNUST College of Art", ["GD", "GKA", "PM"], "design process", ["SHS1", "SHS3"], "beginner", 4, "Solve problems like a designer: research, sketch, test, improve.", ["Empathise", "Ideate", "Prototype", "Critique"]),
  C("smart-farming", "Smart Farming", "University for Development Studies", ["GAGRIC", "CROP", "ANH"], "modern agriculture", ["SHS1", "SHS3"], "beginner", 6, "Soil, water and data — farming methods that raise yields.", ["Soil health", "Irrigation", "Pests", "Farm records"]),
  C("technical-drawing-cad", "From Technical Drawing to CAD", "Accra Technical University", ["TD", "BC"], "CAD", ["SHS1", "SHS3"], "intermediate", 8, "Move from paper drawings to free CAD software on a laptop.", ["Projections", "Dimensions", "CAD basics", "A house plan"], { beyond: true }),
  C("nutrition-for-life", "Nutrition for Life", "University of Ghana", ["FN", "MIL", "BIO"], "nutrition", ["JHS2", "SHS3"], "beginner", 4, "Balanced diets on a budget, food safety and healthy habits.", ["Nutrients", "Balanced diets", "Food safety", "Meal planning"]),
  C("study-skills-that-stick", "Study Skills That Stick", "ClassProject Open", [], "study skills", ["JHS1", "SHS3"], "beginner", 2, "Spaced practice, self-testing and planning — how to learn more in less time.", ["How memory works", "Self-testing", "Spacing", "Planning revision"]),
];

// ------------------------------------------------------------------ levels and subjects

const LEVEL_ORDER = ["BASIC1", "BASIC2", "BASIC3", "BASIC4", "BASIC5", "BASIC6", "JHS1", "JHS2", "JHS3", "SHS1", "SHS2", "SHS3"];
const rank = (level: string) => LEVEL_ORDER.indexOf(level);
/** Years in which exam prep is relevant: BECE is taken at the end of JHS 3, WASSCE at the end of SHS 3. */
const EXAM_YEARS: Record<NonNullable<MoocCourse["exam"]>, [string, string]> = { BECE: ["JHS2", "JHS3"], WASSCE: ["SHS2", "SHS3"] };
const inExamYears = (exam: MoocCourse["exam"], lv: number) => !!exam && lv >= rank(EXAM_YEARS[exam][0]) && lv <= rank(EXAM_YEARS[exam][1]);

/** "SHS 2" / "JHS 1" / "Primary 4" / "Basic 5" → SHS2 / JHS1 / BASIC4 / BASIC5 (null if unknown). */
export function levelCode(level: string | undefined | null): string | null {
  const m = /\b(SHS|JHS|Primary|Basic|P)\s*(\d)/i.exec(level ?? "");
  if (!m) return null;
  const kind = m[1]!.toUpperCase();
  return `${kind === "SHS" || kind === "JHS" ? kind : "BASIC"}${m[2]}`;
}

/** The catalogue code for a school subject (e.g. EMATH), falling back to the school's own code. */
export function subjectCode(subject: Pick<Subject, "catalogueId" | "code">): string {
  return CATALOGUE_SUBJECTS.find((c) => c.id === subject.catalogueId)?.code ?? subject.code;
}

export const catalogueSubjectName = (code: string) => CATALOGUE_SUBJECTS.find((c) => c.code === code)?.name ?? code;

// ------------------------------------------------------------------ recommendations

export type MoocReasonCode = "subject_match" | "interest_match" | "exam_prep" | "next_level" | "study_skills";

export interface MoocRecommendation {
  course: MoocCourse;
  /** The subject it was matched on. */
  subject: string | null;
  reason: { code: MoocReasonCode; text: string };
  score: number;
}

/**
 * Matching rules from Open spec section 25.4: subject overlap → level fit → exam
 * alignment → freshness; at most two per subject in the first six; every
 * item carries one reason. Inputs are subject codes and a level only.
 */
export function recommendMooc({ subjects, interests = [], hidden = [], level, limit = 12 }: { subjects: string[]; interests?: string[]; hidden?: string[]; level: string | null; limit?: number }): MoocRecommendation[] {
  const taken = subjects.filter((s) => !hidden.includes(s));
  const extra = interests.filter((s) => !taken.includes(s) && !hidden.includes(s));
  const lv = level ? rank(level) : -1;
  const scored: MoocRecommendation[] = [];
  for (const course of MOOC_CATALOGUE) {
    const [lo, hi] = [rank(course.levels[0]), rank(course.levels[1])];
    // Level fit: within range, or one level below (a little stretch is fine).
    if (lv >= 0 && (lv < lo - 1 || lv > hi)) continue;
    const fromTaken = course.subjects.find((s) => taken.includes(s));
    const fromInterest = !fromTaken ? course.subjects.find((s) => extra.includes(s)) : undefined;
    const subject = fromTaken ?? fromInterest ?? null;
    if (!subject && course.subjects.length) continue;
    const name = subject ? catalogueSubjectName(subject) : "";
    const primary = subject ? course.subjects.indexOf(subject) === 0 : false;
    let score = fromTaken ? 3 : fromInterest ? 2.2 : 0.6;
    if (primary) score += 0.6;
    if (lv >= lo && lv <= hi) score += 0.5;
    // Mostly pitched below the student's level (a revision course): rank it lower.
    if (lv >= 0 && (lo + hi) / 2 < lv - 1) score -= 0.8;
    const examPrep = inExamYears(course.exam, lv);
    if (examPrep) score += 0.4;
    if (course.free) score += 0.2;
    const reason: MoocRecommendation["reason"] = !subject
      ? { code: "study_skills", text: "Helps with every subject you take" }
      : fromInterest
        ? { code: "interest_match", text: `Because you're interested in ${name} — ${course.topic}` }
        : examPrep
          ? { code: "exam_prep", text: `${course.exam} prep for ${name} — ${course.topic}` }
          : course.beyond
            ? { code: "next_level", text: `Goes beyond the ${name} syllabus — ${course.topic}` }
            : { code: "subject_match", text: `Matches ${name} — ${course.topic}` };
    scored.push({ course, subject, reason, score });
  }
  scored.sort((a, b) => b.score - a.score || a.course.title.localeCompare(b.course.title));
  // Diversity: at most two per subject among the first six.
  const out: MoocRecommendation[] = [];
  const perSubject = new Map<string, number>();
  const later: MoocRecommendation[] = [];
  for (const r of scored) {
    const key = r.subject ?? "_";
    const n = perSubject.get(key) ?? 0;
    if (out.length < 6 && n >= 2) later.push(r);
    else {
      out.push(r);
      perSubject.set(key, n + 1);
    }
  }
  return [...out, ...later].slice(0, limit);
}

/** Where "Open on ClassProject Open" goes: the course page with anonymous referral details (Open spec section 25.2). */
export const moocCourseUrl = (r: Pick<MoocRecommendation, "course" | "subject">, level: string | null) => {
  const q = new URLSearchParams({ ref: "classproject" });
  if (r.subject) q.set("subject", r.subject);
  if (level) q.set("level", level);
  return `${MOOC_URL}/courses/${r.course.slug}?${q}`;
};
