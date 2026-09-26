"use client";

import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { useCurrentUser, useMyStudent, useMyTeacher, useTenant } from "@/lib/session";
import type { ID, LiveSession } from "@/lib/types";

/**
 * Live classes in progress right now that the signed-in user can join or
 * oversee: a student's enrolled subjects, a teacher's own classes, every class
 * in the school for its administrators, and every school for the Super Admin.
 * Drives the "Live" indicators in the sidebar and on subject cards.
 */
export function useLiveNow(): { sessions: LiveSession[]; byCourse: Map<ID, LiveSession> } {
  const me = useCurrentUser();
  const { schoolId } = useTenant();
  const student = useMyStudent();
  const teacher = useMyTeacher();
  const liveSessions = useStore((s) => s.liveSessions);
  const enrollments = useStore((s) => s.enrollments);
  const portal = me?.portal;

  return useMemo(() => {
    const live = liveSessions.filter((l) => l.status === "live");
    let sessions: LiveSession[] = [];
    if (portal === "super-admin") sessions = schoolId ? live.filter((l) => l.schoolId === schoolId) : live;
    else if (portal === "school") sessions = live.filter((l) => l.schoolId === schoolId);
    else if (portal === "teacher") sessions = live.filter((l) => l.teacherId === teacher?.id);
    else if (portal === "student" && student) {
      const mine = new Set(enrollments.filter((e) => e.studentId === student.id).map((e) => `${e.classId}|${e.subjectId}`));
      sessions = live.filter((l) => mine.has(`${l.classId}|${l.subjectId}`));
    }
    return { sessions, byCourse: new Map(sessions.map((l) => [l.courseId, l])) };
  }, [liveSessions, enrollments, portal, schoolId, student, teacher]);
}
