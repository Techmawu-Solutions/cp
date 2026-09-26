"use client";

import { useMemo } from "react";
import { useSchoolData } from "@/lib/queries";
import { useMyStudent } from "@/lib/session";
import { useStore } from "@/lib/store";
import type { Assessment, ContentItem, Course, Submission } from "@/lib/types";
import { isLive } from "@/lib/publishing";

export type WorkState = "todo" | "overdue" | "submitted" | "graded" | "missed";

/** The signed-in student's courses, progress and work for the selected session. */
export function useStudentData() {
  const d = useSchoolData();
  const student = useMyStudent();
  const progress = useStore((s) => s.progress);
  const modules = useStore((s) => s.modules);
  return useMemo(() => {
    const enrolled = d.enrollments.filter((e) => e.studentId === student?.id);
    const courses: Course[] = d.courses.filter((c) => enrolled.some((e) => e.classId === c.classId && e.subjectId === c.subjectId)).sort((a, b) => a.title.localeCompare(b.title));
    const courseIds = new Set(courses.map((c) => c.id));
    const done = new Set(progress.filter((p) => p.studentId === student?.id).map((p) => p.contentId));

    /** Published items in course order (published modules only). */
    const itemsOf = (courseId: string): ContentItem[] =>
      modules
        .filter((m) => m.courseId === courseId && isLive(m))
        .sort((a, b) => a.order - b.order)
        .flatMap((m) => d.contents.filter((c) => c.moduleId === m.id && isLive(c)).sort((a, b) => a.order - b.order));
    const progressOf = (courseId: string) => {
      const items = itemsOf(courseId);
      const n = items.filter((i) => done.has(i.id)).length;
      return { total: items.length, done: n, percent: items.length ? (n / items.length) * 100 : 0, next: items.find((i) => !done.has(i.id)) };
    };
    const assessments = d.assessments.filter((a) => courseIds.has(a.courseId) && a.status !== "draft");
    const submissionFor = (a: Assessment): Submission | undefined => d.submissions.find((s) => s.assessmentId === a.id && s.studentId === student?.id);
    const stateOf = (a: Assessment): WorkState => {
      const s = submissionFor(a);
      if (s?.score != null) return "graded";
      if (s) return "submitted";
      if (a.status === "closed") return "missed";
      return Date.now() > Date.parse(a.dueDate) ? "overdue" : "todo";
    };
    const totals = courses.map((c) => progressOf(c.id));
    const overall = totals.reduce((a, t) => a + t.total, 0) ? (totals.reduce((a, t) => a + t.done, 0) / totals.reduce((a, t) => a + t.total, 0)) * 100 : 0;
    return {
      d,
      student,
      courses,
      done,
      itemsOf,
      progressOf,
      overall,
      assessments,
      submissionFor,
      stateOf,
      classId: student ? d.classOf.get(student.id) : undefined,
      liveSessions: d.liveSessions.filter((l) => courseIds.has(l.courseId)),
      recordings: d.recordings.filter((r) => courseIds.has(r.courseId) && r.status === "ready"),
    };
  }, [d, student, progress, modules]);
}
