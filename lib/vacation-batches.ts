"use client";

import { useStore } from "@/lib/store";
import { uid } from "@/lib/helpers";
import { actualMinutes, attended } from "@/lib/live-reports";
import { vacationSchool } from "@/lib/vacation";
import type { DB } from "@/lib/data/seed";
import type { AcademicSession, BatchCloseout, ID, SchoolClass, Subject, VacationBundle, VacationPrice } from "@/lib/types";

/**
 * Vacation batches (spec §49.1.7). Vacation Classes run periodically — a
 * batch (cohort) per school holiday. Each batch is one session of the
 * vacation workspace, so its classes, enrolments, courses, live classes,
 * grades and payments are all scoped to it:
 *
 *   Set up → Registration open → Running → Ended → Closed (records kept)
 *
 * Closing a batch never deletes anything. It makes the batch read-only,
 * cancels registrations that were never paid, ends the teachers' assignments
 * (they stay in the teacher pool for future batches), limits how long
 * students can still open the batch, and produces the batch record.
 * Students and teachers keep one account and one vacation record across
 * batches, so returning students and teachers carry their history.
 */

const S = () => useStore.getState();

export type BatchState = "upcoming" | "registration" | "running" | "ended" | "closed";

export const BATCH_STATE_LABEL: Record<BatchState, string> = {
  upcoming: "Upcoming",
  registration: "Registration open",
  running: "Running",
  ended: "Ended — needs closing",
  closed: "Closed",
};

const day = (d: string, end = false) => Date.parse(`${d}T${end ? "23:59:59" : "00:00:00"}`);

export function batchState(s: AcademicSession, now: number): BatchState {
  if (s.status === "closed") return "closed";
  if (now > day(s.endDate, true)) return "ended";
  if (now >= day(s.startDate)) return "running";
  const b = s.batch;
  if (b?.registrationOpens && now >= day(b.registrationOpens) && (!b.registrationCloses || now <= day(b.registrationCloses, true))) return "registration";
  return "upcoming";
}

/** Students of a closed batch lose access to it after `accessUntil`. */
export const batchAccessible = (s: AcademicSession, now: number) => !s.batch?.closeout?.accessUntil || Date.parse(s.batch.closeout.accessUntil) >= now;

export interface BatchSummary {
  students: number;
  returning: number;
  awaitingPayment: number;
  revenue: number;
  teachers: ID[];
  classesHeld: number;
  classesScheduledAfterEnd: number;
  ungraded: number;
  attendanceRate: number | null;
  averageScore: number | null;
}

export function batchSummary(db: DB, sessionId: ID): BatchSummary {
  const session = db.academicSessions.find((s) => s.id === sessionId);
  const regs = db.vacationRegistrations.filter((r) => r.sessionId === sessionId);
  const paid = regs.filter((r) => r.status === "paid");
  const earlier = new Set(db.vacationRegistrations.filter((r) => r.status === "paid" && r.sessionId !== sessionId && (db.academicSessions.find((s) => s.id === r.sessionId)?.startDate ?? "") < (session?.startDate ?? "")).map((r) => r.userId));
  const lives = db.liveSessions.filter((l) => l.sessionId === sessionId);
  const liveIds = new Set(lives.map((l) => l.id));
  const att = db.attendance.filter((a) => a.liveSessionId && liveIds.has(a.liveSessionId));
  const assessIds = new Set(db.assessments.filter((a) => a.sessionId === sessionId).map((a) => a.id));
  const subs = db.submissions.filter((x) => assessIds.has(x.assessmentId));
  const graded = subs.filter((x) => x.score != null);
  const pct = graded.map((x) => {
    const a = db.assessments.find((y) => y.id === x.assessmentId)!;
    return (x.score! / a.totalMarks) * 100;
  });
  return {
    students: paid.length,
    returning: paid.filter((r) => earlier.has(r.userId)).length,
    awaitingPayment: regs.filter((r) => r.status === "awaiting_payment").length,
    revenue: paid.reduce((t, r) => t + r.amount, 0),
    teachers: [...new Set(db.teachingAssignments.filter((t) => t.sessionId === sessionId).map((t) => t.teacherId))],
    classesHeld: lives.filter((l) => l.status === "ended").length,
    classesScheduledAfterEnd: session ? lives.filter((l) => l.status === "scheduled" && Date.parse(l.scheduledAt) > day(session.endDate, true)).length : 0,
    ungraded: subs.filter((x) => x.score == null).length,
    attendanceRate: att.length ? (att.filter(attended).length / att.length) * 100 : null,
    averageScore: pct.length ? pct.reduce((a, b) => a + b, 0) / pct.length : null,
  };
}

export interface CloseOptions {
  /** Days after closing that students can still open the batch; null = no limit. */
  accessDays: number | null;
  sendReports: boolean;
  /** Set to invite students to register for this batch. */
  inviteTo?: ID;
  /** Deactivate vacation teachers who have no assignment in a later batch (they can be reactivated). */
  deactivateNonReturning: boolean;
}

/** Winds up a batch. Nothing is deleted; see the module comment. */
export function closeBatch(sessionId: ID, opts: CloseOptions): BatchCloseout | null {
  const s = S();
  const session = s.academicSessions.find((x) => x.id === sessionId);
  const school = vacationSchool(s);
  if (!session || !school) return null;
  const summary = batchSummary(s, sessionId);
  const now = new Date();

  // Registrations that were never paid are cancelled — those students never joined the batch.
  const unpaid = s.vacationRegistrations.filter((r) => r.sessionId === sessionId && r.status === "awaiting_payment");
  for (const r of unpaid) s.update("vacationRegistrations", r.id, { status: "cancelled" });

  // Live classes still scheduled for this batch will not take place.
  for (const l of s.liveSessions.filter((x) => x.sessionId === sessionId && x.status === "scheduled")) s.update("liveSessions", l.id, { status: "cancelled" });

  // Teachers: assignments end with the batch. Those not teaching a later batch can be deactivated.
  const later = new Set(s.academicSessions.filter((x) => x.schoolId === school.id && x.id !== sessionId && x.status !== "closed" && x.startDate > session.startDate).map((x) => x.id));
  const returning = new Set(s.teachingAssignments.filter((t) => later.has(t.sessionId)).map((t) => t.teacherId));
  let deactivated = 0;
  if (opts.deactivateNonReturning) {
    for (const tid of summary.teachers) {
      if (returning.has(tid)) continue;
      s.update("teachers", tid, { status: "inactive" });
      deactivated++;
    }
  }

  const paid = s.vacationRegistrations.filter((r) => r.sessionId === sessionId && r.status === "paid");
  const accessUntil = opts.accessDays == null ? null : new Date(now.getTime() + opts.accessDays * 86_400_000).toISOString();
  const nextBatch = opts.inviteTo ? s.academicSessions.find((x) => x.id === opts.inviteTo) : undefined;
  for (const r of paid) {
    if (opts.sendReports)
      s.notify({ userId: r.userId, schoolId: school.id, kind: "system", title: `${session.name} completed`, body: `Thank you for joining. Your results and attendance are in your batch report${accessUntil ? `; recordings stay available until ${new Date(accessUntil).toDateString()}` : ""}.`, href: "/student/grades" });
    if (nextBatch) s.notify({ userId: r.userId, schoolId: null, kind: "system", title: `Registration open: ${nextBatch.name}`, body: `Continue with Vacation Classes — ${nextBatch.name} starts ${new Date(nextBatch.startDate).toDateString()}.`, href: "/vacation/register" });
  }

  const me = s.users.find((u) => u.id === s.userId);
  const closeout: BatchCloseout = {
    closedAt: now.toISOString(),
    closedBy: me?.name ?? "System",
    accessUntil,
    studentsCompleted: paid.length,
    unpaidCancelled: unpaid.length,
    teachersReleased: summary.teachers.length,
    teachersDeactivated: deactivated,
    reportsSent: opts.sendReports,
    invitedTo: nextBatch?.id,
  };
  s.update("academicSessions", sessionId, { status: "closed", batch: { number: session.batch?.number ?? 1, ...session.batch, closeout } });
  s.audit({ schoolId: school.id, action: "Batch closed", target: `${session.name}: ${paid.length} students completed, ${unpaid.length} unpaid registrations cancelled, ${summary.teachers.length} teachers released`, category: "academic" });
  return closeout;
}

export interface SetupInput {
  name: string;
  startDate: string;
  endDate: string;
  registrationOpens: string;
  registrationCloses: string;
  /** Batch to copy the structure from. */
  copyFrom?: ID;
  copy: { classes: boolean; subjects: boolean; pricing: boolean; bundles: boolean };
  /** Fill in an existing (empty) upcoming batch instead of creating one. */
  existingSessionId?: ID;
}

/** Creates the next batch (or fills an existing empty one), copying classes, subjects, prices and bundles. */
export function setupBatch(input: SetupInput): AcademicSession | null {
  const s = S();
  const school = vacationSchool(s);
  if (!school) return null;
  const batches = s.academicSessions.filter((x) => x.schoolId === school.id);
  const number = Math.max(0, ...batches.map((x) => x.batch?.number ?? 0)) + 1;
  const year = s.academicYears.filter((y) => y.schoolId === school.id).find((y) => input.startDate >= y.startDate && input.startDate <= y.endDate) ?? s.academicYears.filter((y) => y.schoolId === school.id).sort((a, b) => b.startDate.localeCompare(a.startDate))[0];
  let session: AcademicSession;
  const existing = input.existingSessionId ? s.academicSessions.find((x) => x.id === input.existingSessionId) : undefined;
  const batch = { number: existing?.batch?.number ?? number, registrationOpens: input.registrationOpens, registrationCloses: input.registrationCloses };
  if (existing) {
    s.update("academicSessions", existing.id, { name: input.name.trim(), startDate: input.startDate, endDate: input.endDate, batch: { ...existing.batch, ...batch } });
    session = { ...existing, name: input.name.trim(), startDate: input.startDate, endDate: input.endDate, batch };
  } else {
    session = { id: uid("ses"), schoolId: school.id, academicYearId: year!.id, type: "vacation", name: input.name.trim(), startDate: input.startDate, endDate: input.endDate, status: "upcoming", batch };
    s.insert("academicSessions", session);
  }

  const from = input.copyFrom;
  const classMap = new Map<ID, ID>();
  const subjectMap = new Map<ID, ID>();
  if (from) {
    const programme = s.programmes.find((p) => p.schoolId === school.id && p.sessionId === from);
    let programmeId = programme?.id ?? "";
    if (programme && !s.programmes.some((p) => p.sessionId === session.id)) {
      programmeId = uid("prg");
      s.insert("programmes", { ...programme, id: programmeId, sessionId: session.id });
    }
    if (input.copy.classes) {
      const classes: SchoolClass[] = s.classes.filter((c) => c.sessionId === from).map((c) => {
        const id = uid("cls");
        classMap.set(c.id, id);
        return { ...c, id, sessionId: session.id, programmeId: programmeId || c.programmeId, classTeacherId: undefined };
      });
      s.insertMany("classes", classes);
    }
    if (input.copy.subjects) {
      const subjects: Subject[] = s.subjects.filter((x) => x.sessionId === from).map((x) => {
        const id = uid("sub");
        subjectMap.set(x.id, id);
        return { ...x, id, sessionId: session.id };
      });
      s.insertMany("subjects", subjects);
    }
    if (input.copy.pricing && input.copy.subjects) {
      const prices: VacationPrice[] = s.vacationPrices.filter((p) => p.sessionId === from && subjectMap.has(p.subjectId)).map((p) => ({ ...p, id: uid("vp"), sessionId: session.id, subjectId: subjectMap.get(p.subjectId)!, classIds: p.classIds.map((c) => classMap.get(c)).filter((c): c is ID => !!c) }));
      s.insertMany("vacationPrices", prices);
    }
    if (input.copy.bundles && input.copy.subjects) {
      const bundles: VacationBundle[] = s.vacationBundles.filter((b) => b.sessionId === from).map((b) => ({ ...b, id: uid("vb"), sessionId: session.id, classIds: b.classIds.map((c) => classMap.get(c)).filter((c): c is ID => !!c), subjectIds: b.subjectIds.map((x) => subjectMap.get(x)).filter((x): x is ID => !!x) }));
      s.insertMany("vacationBundles", bundles);
    }
  }
  s.audit({ schoolId: school.id, action: existing ? "Batch set up" : "Batch created", target: `${session.name} (batch ${session.batch?.number ?? batch.number})${from ? ` from ${s.academicSessions.find((x) => x.id === from)?.name}` : ""}`, category: "academic" });
  return session;
}

/**
 * The batch record: one sheet per list, for the coordinator's files and for
 * paying teachers (classes held and hours taught).
 */
export function batchRecord(db: DB, sessionId: ID) {
  const name = (userId: ID) => db.users.find((u) => u.id === userId)?.name ?? "";
  const regs = db.vacationRegistrations.filter((r) => r.sessionId === sessionId);
  const lives = db.liveSessions.filter((l) => l.sessionId === sessionId);
  const liveIds = new Set(lives.map((l) => l.id));
  const assessments = db.assessments.filter((a) => a.sessionId === sessionId);
  const students = regs
    .filter((r) => r.status === "paid")
    .map((r) => {
      const st = db.students.find((x) => x.id === r.studentId);
      const home = db.students.find((x) => x.userId === r.userId && x.schoolId !== st?.schoolId);
      const att = db.attendance.filter((a) => a.studentId === r.studentId && a.liveSessionId && liveIds.has(a.liveSessionId));
      const subs = db.submissions.filter((x) => x.studentId === r.studentId && assessments.some((a) => a.id === x.assessmentId) && x.score != null);
      const avg = subs.length ? subs.reduce((t, x) => t + (x.score! / assessments.find((a) => a.id === x.assessmentId)!.totalMarks) * 100, 0) / subs.length : null;
      return [
        st?.studentNumber ?? "",
        name(r.userId),
        home?.indexNumber ?? st?.indexNumber ?? "",
        r.homeSchoolName ?? "",
        db.classes.find((c) => c.id === r.classId)?.name ?? "",
        r.subjectIds.map((x) => db.subjects.find((y) => y.id === x)?.name).filter(Boolean).join(", "),
        r.amount,
        att.length ? Math.round((att.filter(attended).length / att.length) * 100) : "",
        att.reduce((t, a) => t + (a.durationMinutes ?? 0), 0),
        avg == null ? "" : Math.round(avg),
      ];
    });
  const teacherIds = [...new Set(db.teachingAssignments.filter((t) => t.sessionId === sessionId).map((t) => t.teacherId))];
  const teachers = teacherIds.map((tid) => {
    const t = db.teachers.find((x) => x.id === tid);
    const mine = lives.filter((l) => l.teacherId === tid);
    const held = mine.filter((l) => l.status === "ended");
    const minutes = held.reduce((m, l) => m + (actualMinutes(l) ?? 0), 0);
    const classes = db.teachingAssignments.filter((x) => x.sessionId === sessionId && x.teacherId === tid).map((x) => `${db.subjects.find((y) => y.id === x.subjectId)?.name} — ${db.classes.find((y) => y.id === x.classId)?.name}`);
    return [t?.staffNumber ?? "", t ? `${t.title} ${t.firstName} ${t.lastName}` : "", classes.join("; "), mine.length, held.length, +(minutes / 60).toFixed(1)];
  });
  const payments = regs.map((r) => [name(r.userId), r.status, r.amount, r.payment?.reference ?? "", r.payment?.method ?? "", r.payment?.paidAt ? new Date(r.payment.paidAt).toLocaleDateString("en-GB") : ""]);
  return {
    sheets: [
      { name: "Students", header: ["Student ID", "Name", "Index number", "Home school", "Class", "Subjects", "Paid (GHS)", "Live attendance %", "Minutes in live classes", "Average score %"], rows: students },
      { name: "Teachers", header: ["Staff ID", "Teacher", "Subjects taught", "Live classes scheduled", "Live classes held", "Hours taught"], rows: teachers },
      { name: "Payments", header: ["Student", "Status", "Amount (GHS)", "Reference", "Method", "Paid on"], rows: payments },
    ],
  };
}
