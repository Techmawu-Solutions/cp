"use client";

import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { useStudentData } from "@/lib/student";
import { useCurrentUser, useMyTeacher } from "@/lib/session";
import { isLive } from "@/lib/publishing";
import type { ContentItem, CourseModule } from "@/lib/types";
import { isUpcomingOrLive } from "@/lib/live-reports";
import { useNow } from "@/lib/use-now";
import { libraryKey, librarySectionsFor } from "@/lib/library";
import { isSessionClosed } from "@/lib/session-lock";

/**
 * Everything the learning area needs for one course: its visible sections and
 * items in order, and the student's progress. Students see only what's shown
 * to them; the course's teacher and school staff get a read-only preview of
 * the same view (no completion tracking). In a closed academic session students
 * can still open everything, but nothing they do is recorded (spec section 6.5).
 */
export function useLearnCourse(courseId: string) {
  const me = useCurrentUser();
  const s = useStudentData();
  const myTeacher = useMyTeacher();
  const modules = useStore((st) => st.modules);
  const contents = useStore((st) => st.contents);
  const libraryTopics = useStore((st) => st.libraryTopics);
  const libraryMaterials = useStore((st) => st.libraryMaterials);
  const sessions = useStore((st) => st.academicSessions);
  const { d } = s;
  const now = useNow();
  const isStudent = me?.portal === "student";

  return useMemo(() => {
    const course = isStudent ? s.courses.find((c) => c.id === courseId) : d.byId.course.get(courseId);
    const canPreview = !isStudent && !!course && (me?.portal === "teacher" ? course.teacherId === myTeacher?.id : !!me?.can("courses.view"));
    if (!course || (!isStudent && !canPreview)) return null;

    const own: CourseModule[] = modules.filter((m) => m.courseId === course.id && isLive(m)).sort((a, b) => a.order - b.order);
    const itemsBySection = new Map<string, ContentItem[]>(
      own.map((m) => [m.id, contents.filter((c) => c.moduleId === m.id && isLive(c)).sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt))]),
    );
    // The ClassProject library for this subject and level follows the teacher's sections (spec section 25.3).
    const library = librarySectionsFor(libraryKey(d.byId.subject.get(course.subjectId), d.byId.class.get(course.classId)), course.id, libraryTopics, libraryMaterials);
    library.itemsBySection.forEach((v, k) => itemsBySection.set(k, v));
    const sections = [...own, ...library.sections];
    const items = sections.flatMap((m) => itemsBySection.get(m.id)!);
    const done = isStudent ? s.done : new Set<string>();
    const doneCount = items.filter((i) => done.has(i.id)).length;
    return {
      course,
      preview: !isStudent,
      /** The course's session has closed: progress is shown but no longer recorded. */
      closed: isSessionClosed({ academicSessions: sessions }, course.sessionId),
      student: s.student,
      subject: d.byId.subject.get(course.subjectId),
      cls: d.byId.class.get(course.classId),
      teacher: d.byId.teacher.get(course.teacherId),
      sections,
      /** How many of the sections are the teacher's own; the rest come from the ClassProject library. */
      ownSectionCount: own.length,
      itemsBySection,
      items,
      done,
      progress: { done: doneCount, total: items.length, percent: items.length ? (doneCount / items.length) * 100 : 0, next: items.find((i) => !done.has(i.id)) },
      assessments: s.assessments.filter((a) => a.courseId === course.id),
      recordings: (isStudent ? s.recordings : d.recordings).filter((r) => r.courseId === course.id),
      announcements: d.announcements.filter((a) => a.courseId === course.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      liveSessions: d.liveSessions.filter((l) => l.courseId === course.id && isUpcomingOrLive(l, now)).sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)),
      s,
      d,
    };
  }, [courseId, isStudent, s, d, me, myTeacher, modules, contents, libraryTopics, libraryMaterials, sessions, now]);
}

export type LearnCourse = NonNullable<ReturnType<typeof useLearnCourse>>;
