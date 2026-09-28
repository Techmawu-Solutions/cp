import type { DB } from "@/lib/data/seed";
import type { ContentItem, ContentType, Course, ID } from "@/lib/types";

/**
 * Learning outcomes and learning indicators (spec §25.2). Teachers write them
 * for each lesson; teachers and administrators see them, students never do.
 * Administrators track which teachers have written them.
 */

/** Content that counts as a lesson (assessments, live classes and recordings don't). */
export const LESSON_TYPES: ContentType[] = ["text", "video", "pdf", "ebook", "presentation", "file", "link", "scorm"];
export const isLesson = (c: Pick<ContentItem, "type">) => LESSON_TYPES.includes(c.type);

export type OutcomeStatus = "complete" | "partial" | "missing";
export const OUTCOME_LABEL: Record<OutcomeStatus, string> = { complete: "Outcomes and indicators", partial: "Outcomes only", missing: "Not added" };

const filled = (xs: string[] | undefined) => (xs ?? []).some((x) => x.trim());

/** A lesson is complete with at least one outcome and one indicator. */
export function outcomeStatus(c: Pick<ContentItem, "learningOutcomes" | "learningIndicators">): OutcomeStatus {
  const o = filled(c.learningOutcomes);
  const i = filled(c.learningIndicators);
  return o && i ? "complete" : o || i ? "partial" : "missing";
}

/** Text area value (one item per line) ↔ list. */
export const toLines = (xs: string[] | undefined) => (xs ?? []).join("\n");
export const fromLines = (text: string) =>
  text
    .split("\n")
    .map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim())
    .filter(Boolean);

export interface TeacherCoverage {
  teacherId: ID;
  schoolId: ID;
  name: string;
  courses: number;
  lessons: number;
  complete: number;
  partial: number;
  missing: number;
  /** Share of lessons with both outcomes and indicators, 0–100. */
  percent: number;
  lastUpdated?: string;
}

export interface LessonRow {
  item: ContentItem;
  course: Course;
  status: OutcomeStatus;
}

/**
 * Coverage per teacher for the given courses (normally one school's courses in
 * the session being viewed, or every school's active session).
 */
export function outcomeCoverage(db: Pick<DB, "teachers" | "contents">, courses: Course[]): { teachers: TeacherCoverage[]; lessons: LessonRow[] } {
  const byCourse = new Map(courses.map((c) => [c.id, c]));
  const lessons: LessonRow[] = db.contents.filter((c) => byCourse.has(c.courseId) && isLesson(c)).map((item) => ({ item, course: byCourse.get(item.courseId)!, status: outcomeStatus(item) }));
  const map = new Map<ID, TeacherCoverage>();
  for (const course of courses) {
    if (map.has(course.teacherId)) continue;
    const t = db.teachers.find((x) => x.id === course.teacherId);
    map.set(course.teacherId, { teacherId: course.teacherId, schoolId: course.schoolId, name: t ? `${t.title} ${t.firstName} ${t.lastName}` : "Unassigned", courses: 0, lessons: 0, complete: 0, partial: 0, missing: 0, percent: 0 });
  }
  for (const course of courses) map.get(course.teacherId)!.courses++;
  for (const l of lessons) {
    const row = map.get(l.course.teacherId)!;
    row.lessons++;
    row[l.status]++;
    if (l.item.outcomesUpdatedAt && (!row.lastUpdated || l.item.outcomesUpdatedAt > row.lastUpdated)) row.lastUpdated = l.item.outcomesUpdatedAt;
  }
  const teachers = [...map.values()].map((r) => ({ ...r, percent: r.lessons ? Math.round((r.complete / r.lessons) * 100) : 0 }));
  return { teachers, lessons };
}

/** "Complete", "In progress" or "Not started" for a teacher. */
export function teacherState(t: Pick<TeacherCoverage, "lessons" | "complete" | "partial">) {
  if (!t.lessons) return { label: "No lessons", tone: "gray" as const };
  if (t.complete === t.lessons) return { label: "Complete", tone: "green" as const };
  if (t.complete + t.partial === 0) return { label: "Not started", tone: "red" as const };
  return { label: "In progress", tone: "amber" as const };
}

/** Example outcomes and indicators for seeded lessons, in the curriculum's wording. */
export function sampleOutcomes(topic: string, subject: string) {
  const t = topic.replace(/\s*\(.*?\)\s*$/, "").replace(/^(Video|Reading|Worksheet|Slides):\s*/i, "");
  const lower = t.charAt(0).toLowerCase() + t.slice(1);
  return {
    learningOutcomes: [`Learners can explain the main ideas of ${lower}.`, `Learners can apply what they learn about ${lower} to everyday situations in ${subject}.`],
    learningIndicators: [`State the key terms used in ${lower} and what they mean.`, `Give two examples of ${lower} from everyday life in Ghana.`, `Answer at least three of four short questions on ${lower} correctly.`],
  };
}
