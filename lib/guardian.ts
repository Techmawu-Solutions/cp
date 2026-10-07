import { isLive } from "@/lib/publishing";
import { gradeLetter } from "@/lib/queries";
import { accessEnded } from "@/lib/promotion";
import type { DB } from "@/lib/data/seed";
import type { Assessment, GuardianLink, ID, School, Student } from "@/lib/types";

/**
 * What a parent or guardian sees about one ward (spec section 22.3): the school's
 * active session only, read from the same records the student and teachers use.
 * Nothing here is written back; parents can't change a student's work.
 */

export type WardWork = "todo" | "overdue" | "submitted" | "graded" | "missed";
export type WardAttendance = "present" | "late" | "left_early" | "absent" | "excused";

/** A student joined but spent less than this share of the class in the room. */
const LEFT_EARLY_SHARE = 0.75;

export function wardsOf(db: Pick<DB, "guardianLinks" | "students" | "schools">, guardianUserId: ID) {
  return db.guardianLinks
    .filter((l) => l.guardianUserId === guardianUserId)
    .map((link) => {
      const student = db.students.find((s) => s.id === link.studentId);
      const school = db.schools.find((s) => s.id === link.schoolId);
      // A graduate's parents follow them only while the graduate's own access lasts (spec section 22.4).
      return student && school && !accessEnded(student) ? { link, student, school } : null;
    })
    .filter((x): x is { link: GuardianLink; student: Student; school: School } => !!x);
}

/** Parent access is decided per school by the Super Administrator; a suspended school hides everything too. */
export const parentAccessOn = (school: School | undefined | null) => !!school?.parentAccess && school.status === "active";

export function wardReport(db: DB, studentId: ID, now = Date.now()) {
  const student = db.students.find((s) => s.id === studentId);
  if (!student) return null;
  const school = db.schools.find((s) => s.id === student.schoolId)!;
  const graduated = student.status === "graduated";
  const session =
    (graduated ? db.academicSessions.filter((s) => db.placements.some((p) => p.studentId === studentId && p.sessionId === s.id)).sort((a, b) => b.startDate.localeCompare(a.startDate))[0] : undefined) ??
    db.academicSessions.find((s) => s.schoolId === school.id && s.status === "active") ??
    db.academicSessions.filter((s) => s.schoolId === school.id).sort((a, b) => b.startDate.localeCompare(a.startDate))[0];
  const year = db.academicYears.find((y) => y.id === session?.academicYearId);
  const sessionId = session?.id;
  const placement = db.placements.find((p) => p.studentId === studentId && p.sessionId === sessionId);
  const cls = db.classes.find((c) => c.id === placement?.classId);
  const user = db.users.find((u) => u.id === student.userId);

  const enrolments = db.enrollments.filter((e) => e.studentId === studentId && e.sessionId === sessionId);
  const courses = db.courses.filter((c) => c.sessionId === sessionId && enrolments.some((e) => e.classId === c.classId && e.subjectId === c.subjectId));
  const done = new Map(db.progress.filter((p) => p.studentId === studentId).map((p) => [p.contentId, p.completedAt]));

  const subjects = courses
    .map((course) => {
      const subject = db.subjects.find((s) => s.id === course.subjectId);
      const ta = db.teachingAssignments.find((t) => t.sessionId === sessionId && t.classId === course.classId && t.subjectId === course.subjectId);
      const teacher = db.teachers.find((t) => t.id === (ta?.teacherId ?? course.teacherId));
      const modules = db.modules.filter((m) => m.courseId === course.id && isLive(m, now));
      const items = db.contents.filter((c) => c.courseId === course.id && isLive(c, now) && modules.some((m) => m.id === c.moduleId));
      const completed = items.filter((i) => done.has(i.id)).length;
      return { course, subject, teacher, total: items.length, completed, percent: items.length ? (completed / items.length) * 100 : 0 };
    })
    .sort((a, b) => (a.subject?.name ?? "").localeCompare(b.subject?.name ?? ""));

  const courseIds = new Set(courses.map((c) => c.id));
  const subjectOf = (courseId: ID) => subjects.find((s) => s.course.id === courseId)?.subject;
  const assessments = db.assessments.filter((a) => courseIds.has(a.courseId) && a.status !== "draft");
  const submissionFor = (a: Assessment) => db.submissions.find((s) => s.assessmentId === a.id && s.studentId === studentId);
  const work = assessments
    .map((a) => {
      const sub = submissionFor(a);
      const state: WardWork = sub?.score != null ? "graded" : sub ? "submitted" : a.status === "closed" ? "missed" : now > Date.parse(a.dueDate) ? "overdue" : "todo";
      const percent = sub?.score != null && a.totalMarks ? (sub.score / a.totalMarks) * 100 : null;
      return { assessment: a, subject: subjectOf(a.courseId), submission: sub, state, percent, grade: percent != null ? gradeLetter(percent) : null };
    })
    .sort((a, b) => b.assessment.dueDate.localeCompare(a.assessment.dueDate));

  const graded = work.filter((w) => w.percent != null);
  const average = graded.length ? graded.reduce((t, w) => t + w.percent!, 0) / graded.length : null;

  // Live classes that have finished, and whether the ward was there.
  const held = db.liveSessions.filter((l) => courseIds.has(l.courseId) && l.status === "ended" && l.startedAt).sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt));
  const attendance = held.map((live) => {
    const rec = db.attendance.find((a) => a.liveSessionId === live.id && a.studentId === studentId);
    const planned = live.startedAt && live.endedAt ? (Date.parse(live.endedAt) - Date.parse(live.startedAt)) / 60_000 : live.durationMinutes;
    let status: WardAttendance = rec?.status === "excused" ? "excused" : !rec || rec.status === "absent" ? "absent" : rec.status === "late" ? "late" : "present";
    if ((status === "present" || status === "late") && rec?.durationMinutes != null && planned > 0 && rec.durationMinutes < planned * LEFT_EARLY_SHARE) status = "left_early";
    return { live, subject: subjectOf(live.courseId), record: rec, status, minutes: rec?.durationMinutes ?? 0 };
  });
  const attendedCount = attendance.filter((a) => a.status !== "absent").length;
  const upcomingLive = db.liveSessions
    .filter((l) => courseIds.has(l.courseId) && (l.status === "scheduled" || l.status === "live") && Date.parse(l.scheduledAt) + l.durationMinutes * 60_000 > now)
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));

  // Recent activity: lessons completed and work handed in, newest first.
  const contentById = new Map(db.contents.filter((c) => courseIds.has(c.courseId)).map((c) => [c.id, c]));
  const activity = [
    ...[...done.entries()].filter(([id]) => contentById.has(id)).map(([id, at]) => ({ at, kind: "lesson" as const, title: contentById.get(id)!.title, subject: subjectOf(contentById.get(id)!.courseId) })),
    ...work.filter((w) => w.submission).map((w) => ({ at: w.submission!.submittedAt, kind: "submission" as const, title: w.assessment.title, subject: w.subject })),
    ...attendance.filter((a) => a.status !== "absent").map((a) => ({ at: a.record?.joinTime ?? a.live.startedAt!, kind: "live" as const, title: a.live.title, subject: a.subject })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 15);

  const totalItems = subjects.reduce((t, s) => t + s.total, 0);
  return {
    student,
    school,
    session,
    sessionLabel: session ? `${year?.name ?? ""} — ${session.name}` : "No session",
    cls,
    lastActive: user?.lastActive,
    subjects,
    progress: totalItems ? (subjects.reduce((t, s) => t + s.completed, 0) / totalItems) * 100 : 0,
    work,
    due: work.filter((w) => w.state === "todo").sort((a, b) => a.assessment.dueDate.localeCompare(b.assessment.dueDate)),
    overdue: work.filter((w) => w.state === "overdue" || w.state === "missed"),
    graded,
    average,
    attendance,
    attendanceRate: attendance.length ? (attendedCount / attendance.length) * 100 : null,
    upcomingLive,
    activity,
  };
}

export type WardReport = NonNullable<ReturnType<typeof wardReport>>;
