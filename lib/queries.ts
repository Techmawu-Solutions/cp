"use client";

import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { useScope } from "@/lib/session";
import { indexBy } from "@/lib/helpers";
import { markQuestion } from "@/lib/questions";
import type { Assessment, Course, ID, Student, Submission } from "@/lib/types";

/**
 * Everything a school-scoped screen needs, filtered to the current tenant and
 * the academic session picked in the header. Changing the session selector
 * re-derives all of it (spec §6.5, §7).
 */
export function useSchoolData() {
  const { schoolId, sessionId, school, session } = useScope();
  const s = useStore();
  return useMemo(() => {
    const inSchool = <T extends { schoolId: ID | null }>(xs: T[]) => xs.filter((x) => x.schoolId === schoolId);
    const inSession = <T extends { schoolId: ID; sessionId: ID }>(xs: T[]) => xs.filter((x) => x.schoolId === schoolId && x.sessionId === sessionId);

    const programmes = inSession(s.programmes);
    const classes = inSession(s.classes).sort((a, b) => a.name.localeCompare(b.name));
    const subjects = inSession(s.subjects).sort((a, b) => a.name.localeCompare(b.name));
    const teachingAssignments = inSession(s.teachingAssignments);
    const placements = inSession(s.placements);
    const enrollments = inSession(s.enrollments);
    const courses = inSession(s.courses);
    const assessments = inSession(s.assessments);
    const liveSessions = inSession(s.liveSessions);
    const recordings = inSession(s.recordings);
    const attendance = inSession(s.attendance);
    const teachers = inSchool(s.teachers);
    const allStudents = inSchool(s.students);

    const placedIds = new Set(placements.map((p) => p.studentId));
    const everPlaced = new Set(s.placements.filter((p) => p.schoolId === schoolId).map((p) => p.studentId));
    // Students in this session's classes, plus new students not yet placed anywhere.
    const students = allStudents.filter((st) => placedIds.has(st.id) || (!everPlaced.has(st.id) && st.status === "active"));

    const classOf = new Map(placements.map((p) => [p.studentId, p.classId]));
    const assessmentIds = new Set(assessments.map((a) => a.id));
    const submissions = s.submissions.filter((x) => assessmentIds.has(x.assessmentId));
    const courseIds = new Set(courses.map((c) => c.id));

    return {
      schoolId,
      sessionId,
      school,
      session,
      programmes,
      classes,
      subjects,
      teachingAssignments,
      placements,
      enrollments,
      courses,
      assessments,
      submissions,
      liveSessions,
      recordings,
      attendance,
      teachers,
      students,
      allStudents,
      modules: s.modules.filter((m) => courseIds.has(m.courseId)),
      contents: s.contents.filter((c) => courseIds.has(c.courseId)),
      announcements: s.announcements.filter((a) => a.schoolId === schoolId && a.sessionId === sessionId),
      events: s.events.filter((e) => e.schoolId === schoolId && e.sessionId === sessionId),
      users: inSchool(s.users),
      classOf,
      byId: {
        programme: indexBy(programmes),
        class: indexBy(classes),
        subject: indexBy(subjects),
        teacher: indexBy(teachers),
        student: indexBy(allStudents),
        course: indexBy(courses),
        assessment: indexBy(assessments),
      },
    };
  }, [s, schoolId, sessionId, school, session]);
}

export type SchoolData = ReturnType<typeof useSchoolData>;

/** Scores per student for one course, grouped the way the gradebook shows them (spec §38). */
export function gradebook(course: Course, data: Pick<SchoolData, "assessments" | "submissions" | "placements" | "byId">) {
  const assessments = data.assessments.filter((a) => a.courseId === course.id && a.status !== "draft").sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const roster = data.placements
    .filter((p) => p.classId === course.classId)
    .map((p) => data.byId.student.get(p.studentId))
    .filter((x): x is Student => !!x)
    .sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName));
  const subIndex = new Map<string, Submission>();
  for (const sub of data.submissions) subIndex.set(`${sub.assessmentId}:${sub.studentId}`, sub);

  const rows = roster.map((student) => {
    const cells = assessments.map((a) => subIndex.get(`${a.id}:${student.id}`) ?? null);
    const earned = cells.reduce((acc, c) => acc + (c?.score ?? 0), 0);
    const possible = assessments.reduce((acc, a, i) => acc + (cells[i]?.score != null || a.status === "closed" ? a.totalMarks : 0), 0);
    return { student, cells, earned, possible, percent: possible ? (earned / possible) * 100 : null };
  });
  return { assessments, rows };
}

/** Percentage per assessment type for one student in one course (spec §39). */
export function studentPerformance(studentId: ID, assessments: Assessment[], submissions: Submission[]) {
  const byType: Record<string, { earned: number; possible: number }> = {};
  for (const a of assessments) {
    const sub = submissions.find((x) => x.assessmentId === a.id && x.studentId === studentId);
    if (sub?.score == null && a.status !== "closed") continue;
    const bucket = (byType[a.type] ??= { earned: 0, possible: 0 });
    bucket.earned += sub?.score ?? 0;
    bucket.possible += a.totalMarks;
  }
  const overallEarned = Object.values(byType).reduce((x, b) => x + b.earned, 0);
  const overallPossible = Object.values(byType).reduce((x, b) => x + b.possible, 0);
  return {
    byType: Object.fromEntries(Object.entries(byType).map(([k, b]) => [k, b.possible ? (b.earned / b.possible) * 100 : 0])),
    overall: overallPossible ? (overallEarned / overallPossible) * 100 : null,
  };
}

export function gradeLetter(percent: number): { letter: string; remark: string } {
  // WAEC-style grading bands
  if (percent >= 80) return { letter: "A1", remark: "Excellent" };
  if (percent >= 70) return { letter: "B2", remark: "Very Good" };
  if (percent >= 65) return { letter: "B3", remark: "Good" };
  if (percent >= 60) return { letter: "C4", remark: "Credit" };
  if (percent >= 55) return { letter: "C5", remark: "Credit" };
  if (percent >= 50) return { letter: "C6", remark: "Credit" };
  if (percent >= 45) return { letter: "D7", remark: "Pass" };
  if (percent >= 40) return { letter: "E8", remark: "Pass" };
  return { letter: "F9", remark: "Fail" };
}

export function autoMark(assessment: Assessment, answers: Record<string, string>): { score: number; needsManual: boolean } {
  let score = 0;
  let needsManual = false;
  for (const q of assessment.questions) {
    const earned = markQuestion(q, answers[q.id]);
    if (earned == null) needsManual = true;
    else score += earned;
  }
  return { score: Math.round(score * 10) / 10, needsManual };
}

