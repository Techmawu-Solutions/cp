"use client";

import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { useStudentData } from "@/lib/student";
import { useCurrentUser, useMyTeacher } from "@/lib/session";
import { isLive } from "@/lib/publishing";
import type { ContentItem, CourseModule } from "@/lib/types";

/**
 * Everything the learning area needs for one course: its visible sections and
 * items in order, and the student's progress. Students see only what's shown
 * to them; the course's teacher and school staff get a read-only preview of
 * the same view (no completion tracking).
 */
export function useLearnCourse(courseId: string) {
  const me = useCurrentUser();
  const s = useStudentData();
  const myTeacher = useMyTeacher();
  const modules = useStore((st) => st.modules);
  const contents = useStore((st) => st.contents);
  const { d } = s;
  const isStudent = me?.portal === "student";

  return useMemo(() => {
    const course = isStudent ? s.courses.find((c) => c.id === courseId) : d.byId.course.get(courseId);
    const canPreview = !isStudent && !!course && (me?.portal === "teacher" ? course.teacherId === myTeacher?.id : !!me?.can("courses.view"));
    if (!course || (!isStudent && !canPreview)) return null;

    const sections: CourseModule[] = modules.filter((m) => m.courseId === course.id && isLive(m)).sort((a, b) => a.order - b.order);
    const itemsBySection = new Map<string, ContentItem[]>(
      sections.map((m) => [m.id, contents.filter((c) => c.moduleId === m.id && isLive(c)).sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt))]),
    );
    const items = sections.flatMap((m) => itemsBySection.get(m.id)!);
    const done = isStudent ? s.done : new Set<string>();
    const doneCount = items.filter((i) => done.has(i.id)).length;
    return {
      course,
      preview: !isStudent,
      student: s.student,
      subject: d.byId.subject.get(course.subjectId),
      cls: d.byId.class.get(course.classId),
      teacher: d.byId.teacher.get(course.teacherId),
      sections,
      itemsBySection,
      items,
      done,
      progress: { done: doneCount, total: items.length, percent: items.length ? (doneCount / items.length) * 100 : 0, next: items.find((i) => !done.has(i.id)) },
      assessments: s.assessments.filter((a) => a.courseId === course.id),
      recordings: (isStudent ? s.recordings : d.recordings).filter((r) => r.courseId === course.id),
      announcements: d.announcements.filter((a) => a.courseId === course.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      liveSessions: d.liveSessions.filter((l) => l.courseId === course.id && l.status !== "ended" && l.status !== "cancelled").sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)),
      s,
      d,
    };
  }, [courseId, isStudent, s, d, me, myTeacher, modules, contents]);
}

export type LearnCourse = NonNullable<ReturnType<typeof useLearnCourse>>;
