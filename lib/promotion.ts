import type { ID, ProgressionModel, PromotionOutcome, School, SchoolClass, SchoolType, Student } from "@/lib/types";

/**
 * Promotion, repeating and graduation (spec section 22.4) — the rules, kept free
 * of the store so they can be tested on their own. The workflows that write are
 * in lib/actions.ts.
 */

const range = (prefix: string, from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => `${prefix} ${from + i}`);

/** Each category's ladder until the school sets its own. The last level is the final year. */
export const DEFAULT_LEVELS: Record<SchoolType, string[]> = {
  Primary: range("Basic", 1, 6),
  JHS: range("JHS", 1, 3),
  SHS: range("SHS", 1, 3),
  TVET: range("Year", 1, 3),
  College: ["Level 100", "Level 200", "Level 300", "Level 400"],
  University: ["Level 100", "Level 200", "Level 300", "Level 400"],
};

export const levelsOf = (school: Pick<School, "type" | "levels"> | null | undefined): string[] => (school?.levels?.length ? school.levels : school ? DEFAULT_LEVELS[school.type] : []);

/** Universities and colleges progress each student on their own results; schools move classes up together. */
export const progressionOf = (school: Pick<School, "type" | "progressionModel">): ProgressionModel =>
  school.progressionModel ?? (school.type === "University" || school.type === "College" ? "credit" : "cohort");

export const PROGRESSION_LABEL: Record<ProgressionModel, string> = {
  cohort: "By class (Basic, JHS, SHS)",
  credit: "By student (universities and colleges)",
};

/** The level after this one; null for the final level, undefined for a level that isn't on the ladder. */
export function nextLevel(levels: string[], level: string): string | null | undefined {
  const i = levels.indexOf(level);
  if (i < 0) return undefined;
  return i === levels.length - 1 ? null : levels[i + 1]!;
}

export const isFinalLevel = (levels: string[], level: string) => levels.length > 0 && levels[levels.length - 1] === level;

/**
 * The stream that tells a level's classes apart: "SHS 2A" → "A", "JHS 2 Gold" → "Gold".
 * Schools that name classes by number ("2A1" in SHS 2) drop the leading level number instead.
 */
export function streamOf(className: string, level: string): string {
  const name = className.trim();
  if (name.toLowerCase().startsWith(level.toLowerCase())) return name.slice(level.length).trim();
  const n = /(\d+)\s*$/.exec(level)?.[1];
  if (n && name.startsWith(n)) return name.slice(n.length).trim();
  return name;
}

type ClassLike = Pick<SchoolClass, "id" | "name" | "level" | "programmeId">;

/**
 * Suggests the class each source class moves to at the given level: same programme
 * (matched by code, since each session has its own programme records) and same stream.
 * Falls back to the only class of that programme at that level.
 */
export function matchClass(from: ClassLike, level: string, targets: ClassLike[], programmeCode: (programmeId: ID) => string | undefined): ID | undefined {
  const code = programmeCode(from.programmeId);
  const candidates = targets.filter((t) => t.level === level && programmeCode(t.programmeId) === code);
  const stream = streamOf(from.name, from.level).toLowerCase();
  const same = candidates.find((t) => streamOf(t.name, t.level).toLowerCase() === stream);
  if (same) return same.id;
  return candidates.length === 1 ? candidates[0]!.id : undefined;
}

/** Where each source class's students go by default: the next level for promotion, the same level for repeaters. */
export function suggestClassMap(fromClasses: ClassLike[], toClasses: ClassLike[], levels: string[], programmeCode: (programmeId: ID) => string | undefined) {
  const promote: Record<ID, ID | undefined> = {};
  const repeat: Record<ID, ID | undefined> = {};
  for (const c of fromClasses) {
    const next = nextLevel(levels, c.level);
    if (next) promote[c.id] = matchClass(c, next, toClasses, programmeCode);
    repeat[c.id] = matchClass(c, c.level, toClasses, programmeCode);
  }
  return { promote, repeat };
}

/** Final-year students graduate; everyone else moves up. A level off the ladder is left to the administrator. */
export function defaultOutcome(levels: string[], level: string): PromotionOutcome {
  return isFinalLevel(levels, level) ? "graduate" : "promote";
}

/** The outcomes allowed for a student in this level: only final-year students can graduate. */
export function outcomesFor(levels: string[], level: string): PromotionOutcome[] {
  return isFinalLevel(levels, level) ? ["graduate", "repeat", "leave"] : ["promote", "repeat", "leave"];
}

export const OUTCOME_LABEL: Record<PromotionOutcome, string> = { promote: "Promote", repeat: "Repeat", graduate: "Graduate", leave: "Leave the school" };

export const needsClass = (o: PromotionOutcome) => o === "promote" || o === "repeat";

export interface PlannedStudent {
  studentId: ID;
  fromClassId: ID;
  outcome: PromotionOutcome;
  toClassId?: ID;
}

/** Students who'd be left without a class. */
export const unplaced = (rows: PlannedStudent[]) => rows.filter((r) => needsClass(r.outcome) && !r.toClassId);

export function tally(rows: PlannedStudent[]): Record<PromotionOutcome, number> {
  const t: Record<PromotionOutcome, number> = { promote: 0, repeat: 0, graduate: 0, leave: 0 };
  for (const r of rows) t[r.outcome]++;
  return t;
}

/**
 * The subjects a student is registered for in their new class: every core subject,
 * and the electives they took before (matched by catalogue code). A student with
 * no registrations last year takes all the class's subjects.
 */
export function subjectsToEnrol(classSubjects: { subjectId: ID; code: string; core: boolean }[], previousCodes: Set<string>): ID[] {
  if (previousCodes.size === 0) return classSubjects.map((s) => s.subjectId);
  return classSubjects.filter((s) => s.core || previousCodes.has(s.code)).map((s) => s.subjectId);
}

/** YYYY-MM-DD, `days` after `date`. */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Choices for how long graduates keep read-only access. */
export const ALUMNI_ACCESS_CHOICES: { days: number | null; label: string }[] = [
  { days: 30, label: "30 days" },
  { days: 90, label: "3 months" },
  { days: 365, label: "1 year" },
  { days: null, label: "No access after graduating" },
];

export const accessUntil = (graduatedOn: string, days: number | null) => (days == null ? undefined : addDays(graduatedOn, days));

export const cohortLabelFor = (graduatedOn: string) => `Class of ${graduatedOn.slice(0, 4)}`;

/** A graduate can still sign in and look back, read-only, until their access ends (inclusive). */
export function alumniAccessOpen(student: Pick<Student, "status" | "alumniAccessUntil">, now = Date.now()): boolean {
  if (student.status !== "graduated") return false;
  if (!student.alumniAccessUntil) return false;
  return new Date(`${student.alumniAccessUntil}T23:59:59`).getTime() >= now;
}

/** Students and parents of a graduate whose access has ended can't open the school any more. */
export const accessEnded = (student: Pick<Student, "status" | "alumniAccessUntil">, now = Date.now()) => student.status === "graduated" && !alumniAccessOpen(student, now);
