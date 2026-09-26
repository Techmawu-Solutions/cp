"use client";

import { useStore } from "@/lib/store";
import { uid } from "@/lib/helpers";
import { AVATAR_COLORS } from "@/lib/helpers";
import { autoMark } from "@/lib/queries";
import { isAutoMarked } from "@/lib/questions";
import { indexNumberOf, nextStudentNumbers } from "@/lib/students";
import type {
  AcademicSession,
  AppNotification,
  Assessment,
  AttendanceRecord,
  Course,
  Gender,
  ID,
  LiveSession,
  Recording,
  School,
  SessionType,
  Student,
  Submission,
  Teacher,
  User,
} from "@/lib/types";
import { SAMPLE_VIDEO_URL } from "@/lib/data/content-library";
import { assignSchoolUsernames, isValidWaec, needsSchoolUsername } from "@/lib/usernames";

/**
 * Composite operations — each maps to one future Laravel endpoint. They keep
 * multi-record workflows (onboarding, imports, ending a live class) atomic and
 * make sure every change writes an audit entry (spec §50) and notification
 * (spec §41).
 */
const S = () => useStore.getState();
const color = () => AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]!;

export function sessionNames(type: SessionType): string[] {
  return type === "semester" ? ["Semester 1", "Semester 2"] : ["Term 1", "Term 2", "Term 3"];
}

// ------------------------------------------------------------------ schools

export interface OnboardInput {
  school: Omit<School, "id" | "status" | "dateOnboarded" | "logoColor" | "stats" | "sessionStructure">;
  admin: { name: string; email: string; phone?: string };
  year: { name: string; startDate: string; endDate: string; structure: SessionType };
  sessions: { name: string; startDate: string; endDate: string }[];
  activeIndex: number;
  activate: boolean;
}

/** Spec §61 onboarding: school → admin → academic year → sessions → activate. */
export function onboardSchool(input: OnboardInput): School {
  const id = uid("sch");
  const school: School = {
    ...input.school,
    id,
    status: input.activate ? "active" : "pending",
    dateOnboarded: new Date().toISOString(),
    logoColor: color(),
    sessionStructure: input.year.structure,
    stats: { students: 0, teachers: 0, activeStudents: 0, activeTeachers: 0, liveClasses: 0, assignments: 0, quizzes: 0, engagement: 0 },
  };
  const admin: User = { id: uid("usr"), name: input.admin.name, email: input.admin.email, phone: input.admin.phone, roleId: "role_school_admin", schoolId: id, status: "invited", avatarColor: color() };
  const yearId = uid("ay");
  const s = S();
  s.insert("schools", school);
  s.insert("users", admin);
  s.insert("academicYears", { id: yearId, schoolId: id, name: input.year.name, startDate: input.year.startDate, endDate: input.year.endDate });
  s.insertMany(
    "academicSessions",
    input.sessions.map((x, i) => ({ id: uid("ses"), schoolId: id, academicYearId: yearId, type: input.year.structure, name: x.name, startDate: x.startDate, endDate: x.endDate, status: i === input.activeIndex ? "active" : i < input.activeIndex ? "closed" : "upcoming" }) as AcademicSession),
  );
  s.audit({ schoolId: id, action: "Admin created school", target: school.name, category: "school" });
  s.audit({ schoolId: id, action: "School administrator created", target: `${admin.name} (${admin.email})`, category: "user" });
  s.audit({ schoolId: id, action: "Academic year configured", target: `${input.year.name} · ${input.sessions.length} ${input.year.structure === "semester" ? "semesters" : "terms"}`, category: "academic" });
  if (input.activate) s.audit({ schoolId: id, action: "School activated", target: school.name, category: "school" });
  s.notify({ userId: admin.id, schoolId: id, kind: "system", title: `Welcome to ${s.settings.platformName}`, body: `Your school ${school.name} has been set up. Start with the setup guide.`, href: "/school/setup" });
  return school;
}

export function setSchoolStatus(schoolId: ID, status: School["status"]) {
  const s = S();
  const school = s.schools.find((x) => x.id === schoolId);
  if (!school) return;
  s.update("schools", schoolId, { status });
  const verb = { active: "School activated", suspended: "School suspended", archived: "School archived", pending: "School set to pending" }[status];
  s.audit({ schoolId, action: verb, target: school.name, category: "school" });
}

// ------------------------------------------------------------------ academic sessions

export function createAcademicYear(schoolId: ID, input: { name: string; startDate: string; endDate: string; type: SessionType; sessions: { name: string; startDate: string; endDate: string }[] }) {
  const s = S();
  const yearId = uid("ay");
  s.insert("academicYears", { id: yearId, schoolId, name: input.name, startDate: input.startDate, endDate: input.endDate });
  s.insertMany(
    "academicSessions",
    input.sessions.map((x) => ({ id: uid("ses"), schoolId, academicYearId: yearId, type: input.type, name: x.name, startDate: x.startDate, endDate: x.endDate, status: "upcoming" }) as AcademicSession),
  );
  s.audit({ schoolId, action: "Academic year created", target: input.name, category: "academic" });
  return yearId;
}

/** Only one session is active per school (spec §6.4); the previous active one closes. */
export function activateSession(sessionId: ID) {
  const s = S();
  const target = s.academicSessions.find((x) => x.id === sessionId);
  if (!target) return;
  s.mutate((db) => ({
    academicSessions: db.academicSessions.map((x) =>
      x.schoolId !== target.schoolId ? x : x.id === sessionId ? { ...x, status: "active" } : x.status === "active" ? { ...x, status: "closed" } : x,
    ),
  }));
  s.setSession(target.schoolId, sessionId);
  const year = s.academicYears.find((y) => y.id === target.academicYearId);
  s.audit({ schoolId: target.schoolId, action: "Academic session activated", target: `${year?.name} — ${target.name}`, category: "academic" });
}

/**
 * Copies programmes, classes and subjects from one session into another so a
 * school doesn't rebuild its structure every semester. Records get new IDs, so
 * the two sessions stay isolated (spec §7).
 */
export function copyStructure(fromSessionId: ID, toSessionId: ID) {
  const s = S();
  const progMap = new Map<ID, ID>();
  const programmes = s.programmes.filter((p) => p.sessionId === fromSessionId).map((p) => {
    const id = uid("prg");
    progMap.set(p.id, id);
    return { ...p, id, sessionId: toSessionId };
  });
  const classMap = new Map<ID, ID>();
  const classes = s.classes.filter((c) => c.sessionId === fromSessionId).map((c) => {
    const id = uid("cls");
    classMap.set(c.id, id);
    return { ...c, id, sessionId: toSessionId, programmeId: progMap.get(c.programmeId) ?? c.programmeId };
  });
  const subjMap = new Map<ID, ID>();
  const subjects = s.subjects.filter((x) => x.sessionId === fromSessionId).map((x) => {
    const id = uid("sub");
    subjMap.set(x.id, id);
    return { ...x, id, sessionId: toSessionId, programmeId: x.programmeId ? progMap.get(x.programmeId) : undefined };
  });
  const assignments = s.teachingAssignments.filter((t) => t.sessionId === fromSessionId).map((t) => ({ ...t, id: uid("ta"), sessionId: toSessionId, classId: classMap.get(t.classId)!, subjectId: subjMap.get(t.subjectId)! }));
  s.insertMany("programmes", programmes);
  s.insertMany("classes", classes);
  s.insertMany("subjects", subjects);
  s.insertMany("teachingAssignments", assignments);
  for (const t of assignments) ensureCourse(t.schoolId, t.sessionId, t.subjectId, t.classId, t.teacherId);
  const target = s.academicSessions.find((x) => x.id === toSessionId);
  s.audit({ schoolId: target?.schoolId ?? null, action: "Academic structure copied", target: `${programmes.length} programmes, ${classes.length} classes, ${subjects.length} subjects`, category: "academic" });
  return { programmes: programmes.length, classes: classes.length, subjects: subjects.length };
}

// ------------------------------------------------------------------ programme & subject catalogue (spec §17.1–17.2)

const COLORS = ["#2563eb", "#16a34a", "#db2777", "#ea580c", "#7c3aed", "#0891b2", "#ca8a04", "#dc2626", "#4f46e5", "#059669"];

/** A school selects programmes it offers from the platform catalogue. */
export function addProgrammesFromCatalogue(schoolId: ID, sessionId: ID, catalogueIds: ID[]) {
  const s = S();
  const have = new Set(s.programmes.filter((p) => p.sessionId === sessionId).map((p) => p.catalogueId));
  const rows = s.catalogueProgrammes
    .filter((c) => catalogueIds.includes(c.id) && !have.has(c.id))
    .map((c) => ({ id: uid("prg"), schoolId, sessionId, catalogueId: c.id, name: c.name, code: c.code, description: c.description, status: "active" as const }));
  s.insertMany("programmes", rows);
  if (rows.length) s.audit({ schoolId, action: "Programmes added from catalogue", target: rows.map((r) => r.name).join(", "), category: "academic" });
  return rows;
}

/** A school selects subjects it offers; electives link to the school's matching programme. */
export function addSubjectsFromCatalogue(schoolId: ID, sessionId: ID, catalogueIds: ID[]) {
  const s = S();
  const have = new Set(s.subjects.filter((x) => x.sessionId === sessionId).map((x) => x.catalogueId));
  const programmes = s.programmes.filter((p) => p.sessionId === sessionId);
  const existingCount = s.subjects.filter((x) => x.sessionId === sessionId).length;
  const rows = s.catalogueSubjects
    .filter((c) => catalogueIds.includes(c.id) && !have.has(c.id))
    .map((c, i) => {
      const owners = programmes.filter((p) => c.programmeCodes.includes(p.code));
      return { id: uid("sub"), schoolId, sessionId, catalogueId: c.id, name: c.name, code: c.code, description: c.description, programmeId: owners.length === 1 ? owners[0]!.id : undefined, color: COLORS[(existingCount + i) % COLORS.length]! };
    });
  s.insertMany("subjects", rows);
  if (rows.length) s.audit({ schoolId, action: "Subjects added from catalogue", target: rows.map((r) => r.name).join(", "), category: "academic" });
  return rows;
}

export function submitCatalogueRequest(input: { kind: "programme" | "subject"; name: string; code: string; description: string; reason: string; schoolId: ID; requestedBy: ID }) {
  const s = S();
  const req = { id: uid("req"), status: "pending" as const, createdAt: new Date().toISOString(), ...input, code: input.code.toUpperCase() };
  s.insert("catalogueRequests", req);
  const school = s.schools.find((x) => x.id === input.schoolId);
  for (const admin of s.users.filter((u) => u.roleId === "role_super_admin")) {
    s.notify({ userId: admin.id, schoolId: null, kind: "system", title: `New ${input.kind} request`, body: `${school?.name} requested the ${input.kind} “${input.name}”.`, href: "/super-admin/catalogue?tab=requests" });
  }
  s.audit({ schoolId: input.schoolId, action: `Catalogue ${input.kind} requested`, target: input.name, category: "academic" });
  return req;
}

/**
 * Approve: the item joins the catalogue (or an existing entry is linked),
 * it is added to the requesting school's active session, and the requester
 * is notified. Decline: the requester is notified with the reason.
 */
export function resolveCatalogueRequest(requestId: ID, decision: { approve: true; name: string; code: string; description: string; existingId?: ID; category?: "core" | "elective" } | { approve: false; note: string }) {
  const s = S();
  const req = s.catalogueRequests.find((r) => r.id === requestId);
  if (!req || req.status !== "pending") return;
  const now = new Date().toISOString();
  const resolver = s.userId ?? undefined;
  if (!decision.approve) {
    s.update("catalogueRequests", requestId, { status: "declined", resolvedAt: now, resolvedBy: resolver, note: decision.note });
    s.notify({ userId: req.requestedBy, schoolId: req.schoolId, kind: "system", title: `Request declined: ${req.name}`, body: decision.note || `Your ${req.kind} request was declined.`, href: req.kind === "programme" ? "/school/programmes" : "/school/subjects" });
    s.audit({ schoolId: req.schoolId, action: `Catalogue ${req.kind} request declined`, target: req.name, category: "academic" });
    return;
  }
  let catalogueId = decision.existingId;
  if (!catalogueId) {
    catalogueId = uid(req.kind === "programme" ? "cat_p" : "cat_s");
    if (req.kind === "programme") s.insert("catalogueProgrammes", { id: catalogueId, name: decision.name, code: decision.code.toUpperCase(), description: decision.description, active: true });
    else s.insert("catalogueSubjects", { id: catalogueId, name: decision.name, code: decision.code.toUpperCase(), description: decision.description, category: decision.category ?? "elective", programmeCodes: [], active: true });
  }
  s.update("catalogueRequests", requestId, { status: "approved", resolvedAt: now, resolvedBy: resolver, catalogueId, note: decision.existingId ? "Matched to an existing catalogue entry." : "Added to the catalogue." });
  const session = s.academicSessions.find((x) => x.schoolId === req.schoolId && x.status === "active");
  if (session) {
    if (req.kind === "programme") addProgrammesFromCatalogue(req.schoolId, session.id, [catalogueId]);
    else addSubjectsFromCatalogue(req.schoolId, session.id, [catalogueId]);
  }
  s.notify({ userId: req.requestedBy, schoolId: req.schoolId, kind: "system", title: `Request approved: ${decision.name}`, body: `“${decision.name}” is now in the catalogue${session ? " and has been added to your school for the active session" : ""}.`, href: req.kind === "programme" ? "/school/programmes" : "/school/subjects" });
  s.audit({ schoolId: null, action: `Catalogue ${req.kind} approved`, target: `${decision.name} (requested by ${s.schools.find((x) => x.id === req.schoolId)?.shortName})`, category: "academic" });
}

// ------------------------------------------------------------------ teaching & courses

/** A course exists for every subject × class that has a teacher (spec §24). */
export function ensureCourse(schoolId: ID, sessionId: ID, subjectId: ID, classId: ID, teacherId: ID): Course {
  const s = S();
  const existing = s.courses.find((c) => c.sessionId === sessionId && c.subjectId === subjectId && c.classId === classId);
  if (existing) {
    if (existing.teacherId !== teacherId) s.update("courses", existing.id, { teacherId });
    return { ...existing, teacherId };
  }
  const subject = s.subjects.find((x) => x.id === subjectId);
  const cls = s.classes.find((x) => x.id === classId);
  const course: Course = { id: uid("crs"), schoolId, sessionId, subjectId, classId, teacherId, title: `${subject?.name} — ${cls?.name}`, description: `${subject?.name} for ${cls?.name}.` };
  s.insert("courses", course);
  return course;
}

/** Spec §20: assign a teacher to a subject for a set of classes. */
/** Students still signing in with only their platform username (no WAEC-prefixed school username yet). */
export function pendingSchoolUsernames(schoolId: ID) {
  const s = S();
  const school = s.schools.find((x) => x.id === schoolId);
  return s.students.filter((st) => st.schoolId === schoolId && needsSchoolUsername(st, school)).length;
}

/**
 * Generates WAEC-prefixed school usernames for every student who doesn't have
 * one — e.g. after the school's WAEC code is added (spec §10.1). Platform
 * usernames are unchanged, so integrations keep working.
 */
export function generateSchoolUsernames(schoolId: ID): number {
  const s = S();
  const school = s.schools.find((x) => x.id === schoolId);
  if (!school || !isValidWaec(school.waecCode)) return 0;
  const { students, issued } = assignSchoolUsernames(s.students, school);
  if (!issued) return 0;
  const before = new Map(s.students.map((x) => [x.id, x.schoolUsername]));
  const at = new Date().toISOString();
  const notes: AppNotification[] = students
    .filter((st) => st.schoolId === schoolId && st.schoolUsername !== before.get(st.id))
    .map((st) => ({ id: uid("ntf"), userId: st.userId, schoolId, kind: "system", title: "New school username", body: `You can now sign in with ${st.schoolUsername}. Your platform username still works.`, href: "/profile", createdAt: at, readBy: [] }));
  s.mutate((db) => ({ students, notifications: [...notes, ...db.notifications] }));
  s.audit({ schoolId, action: "School usernames generated", target: `${issued} students · prefix ${school.waecCode}`, category: "user" });
  return issued;
}

export function assignTeacher(schoolId: ID, sessionId: ID, subjectId: ID, teacherId: ID, classIds: ID[]) {
  const s = S();
  const existing = s.teachingAssignments.filter((t) => t.sessionId === sessionId && t.subjectId === subjectId);
  // Remove this teacher from classes that were unticked.
  s.removeWhere("teachingAssignments", (t) => t.sessionId === sessionId && t.subjectId === subjectId && t.teacherId === teacherId && !classIds.includes(t.classId));
  for (const classId of classIds) {
    const current = existing.find((t) => t.classId === classId);
    if (current) {
      if (current.teacherId !== teacherId) s.update("teachingAssignments", current.id, { teacherId });
    } else {
      s.insert("teachingAssignments", { id: uid("ta"), schoolId, sessionId, subjectId, classId, teacherId });
    }
    ensureCourse(schoolId, sessionId, subjectId, classId, teacherId);
  }
  const subject = s.subjects.find((x) => x.id === subjectId);
  const teacher = s.teachers.find((x) => x.id === teacherId);
  s.audit({ schoolId, action: "Teacher assigned", target: `${teacher?.title} ${teacher?.lastName} → ${subject?.name} (${classIds.length} classes)`, category: "academic" });
}

// ------------------------------------------------------------------ people

export interface StudentInput {
  /** Normally left out: the platform generates it (lib/students.ts). */
  studentNumber?: string;
  jhsIndexNumber?: string;
  admissionYear?: number;
  firstName: string;
  lastName: string;
  gender: Gender;
  dateOfBirth: string;
  guardianName: string;
  guardianPhone: string;
  email?: string;
  classId?: string;
}

export function createStudents(schoolId: ID, sessionId: ID | null, rows: StudentInput[], opts: { autoEnroll?: boolean; source?: "manual" | "import" } = {}) {
  const s = S();
  const school = s.schools.find((x) => x.id === schoolId);
  const domain = school?.email.split("@")[1] ?? "school.edu.gh";
  const users: User[] = [];
  const students: Student[] = [];
  // Student IDs are generated here, never typed in (SCHOOL/YY/NNNN by admission year).
  const thisYear = new Date().getFullYear();
  const generated = school ? nextStudentNumbers(school, s.students.filter((x) => x.schoolId === schoolId), rows.map((r) => r.admissionYear ?? thisYear)) : [];
  rows.forEach((r, i) => {
    const userId = uid("usr");
    const studentId = uid("stu");
    const studentNumber = r.studentNumber?.trim() || generated[i] || uid("STU");
    const indexNumber = r.jhsIndexNumber && r.admissionYear ? indexNumberOf(r.jhsIndexNumber, r.admissionYear) : undefined;
    users.push({ id: userId, name: `${r.firstName} ${r.lastName}`, email: r.email?.trim() || `${r.firstName}.${r.lastName}.${studentNumber.replace(/\W/g, "").slice(-4)}@students.${domain}`.toLowerCase(), roleId: "role_student", schoolId, status: "invited", avatarColor: color() });
    students.push({ id: studentId, userId, schoolId, studentNumber, firstName: r.firstName, lastName: r.lastName, gender: r.gender, dateOfBirth: r.dateOfBirth, guardianName: r.guardianName, guardianPhone: r.guardianPhone, jhsIndexNumber: r.jhsIndexNumber, admissionYear: r.admissionYear, indexNumber, status: "active", createdAt: new Date().toISOString() });
  });
  s.insertMany("users", users);
  s.insertMany("students", students);
  if (sessionId) {
    rows.forEach((r, i) => {
      if (r.classId) placeStudents(schoolId, sessionId, [students[i]!.id], r.classId, { autoEnroll: opts.autoEnroll, silent: true });
    });
  }
  s.audit({ schoolId, action: opts.source === "import" ? "Student imported" : "Student created", target: rows.length === 1 ? `${rows[0]!.firstName} ${rows[0]!.lastName}` : `${rows.length} records`, category: "user" });
  return students;
}

/** Assigns students to a class for the session; optionally registers them for the class's subjects. */
export function placeStudents(schoolId: ID, sessionId: ID, studentIds: ID[], classId: ID, opts: { autoEnroll?: boolean; silent?: boolean } = {}) {
  const s = S();
  s.removeWhere("placements", (p) => p.sessionId === sessionId && studentIds.includes(p.studentId));
  s.insertMany("placements", studentIds.map((studentId) => ({ id: uid("plc"), schoolId, sessionId, studentId, classId })));
  if (opts.autoEnroll) {
    const subjectIds = [...new Set(s.teachingAssignments.filter((t) => t.classId === classId).map((t) => t.subjectId))];
    enroll(schoolId, sessionId, classId, studentIds, subjectIds, true);
  }
  if (!opts.silent) {
    const cls = s.classes.find((c) => c.id === classId);
    s.audit({ schoolId, action: "Students assigned to class", target: `${studentIds.length} → ${cls?.name}`, category: "academic" });
  }
}

/** Spec §21: register students for subjects within a class (idempotent). */
export function enroll(schoolId: ID, sessionId: ID, classId: ID, studentIds: ID[], subjectIds: ID[], silent = false) {
  const s = S();
  const have = new Set(s.enrollments.filter((e) => e.sessionId === sessionId).map((e) => `${e.studentId}:${e.subjectId}`));
  const now = new Date().toISOString();
  const rows = studentIds.flatMap((studentId) => subjectIds.filter((subjectId) => !have.has(`${studentId}:${subjectId}`)).map((subjectId) => ({ id: uid("enr"), schoolId, sessionId, studentId, classId, subjectId, enrolledAt: now })));
  if (rows.length) s.insertMany("enrollments", rows);
  if (!silent && rows.length) s.audit({ schoolId, action: "Students registered for subjects", target: `${studentIds.length} students × ${subjectIds.length} subjects`, category: "academic" });
  return rows.length;
}

export function unenroll(sessionId: ID, studentIds: ID[], subjectIds: ID[]) {
  const s = S();
  const before = s.enrollments.length;
  s.removeWhere("enrollments", (e) => e.sessionId === sessionId && studentIds.includes(e.studentId) && subjectIds.includes(e.subjectId));
  const removed = before - S().enrollments.length;
  if (removed) s.audit({ schoolId: s.academicSessions.find((x) => x.id === sessionId)?.schoolId ?? null, action: "Registration removed", target: `${removed} subject registrations`, category: "academic" });
  return removed;
}

export function createTeacher(schoolId: ID, t: Omit<Teacher, "id" | "userId" | "schoolId"> & { email: string }) {
  const s = S();
  const userId = uid("usr");
  const { email, ...rest } = t;
  s.insert("users", { id: userId, name: `${t.title} ${t.firstName} ${t.lastName}`, email, phone: t.phone, roleId: "role_teacher", schoolId, status: "invited", avatarColor: color() });
  const teacher: Teacher = { ...rest, id: uid("tch"), userId, schoolId };
  s.insert("teachers", teacher);
  s.audit({ schoolId, action: "Teacher added", target: `${t.title} ${t.firstName} ${t.lastName}`, category: "user" });
  return teacher;
}

// ------------------------------------------------------------------ LMS

export function notifyCourseStudents(course: Course, n: { kind: Parameters<ReturnType<typeof S>["notify"]>[0]["kind"]; title: string; body: string; href: string }) {
  const s = S();
  const studentIds = new Set(s.enrollments.filter((e) => e.classId === course.classId && e.subjectId === course.subjectId).map((e) => e.studentId));
  for (const st of s.students.filter((x) => studentIds.has(x.id))) s.notify({ userId: st.userId, schoolId: course.schoolId, ...n });
}

export function publishAssessment(a: Assessment) {
  const s = S();
  const course = s.courses.find((c) => c.id === a.courseId);
  if (course && a.status === "published") {
    notifyCourseStudents(course, {
      kind: a.type === "quiz" ? "quiz" : "assignment",
      title: a.type === "quiz" ? "New quiz" : a.type === "assignment" ? "New assignment" : "New assessment",
      body: `${a.title} (${course.title}) is due ${new Date(a.dueDate).toDateString()}.`,
      href: a.type === "quiz" ? "/student/quizzes" : "/student/assignments",
    });
  }
}

export function submitAssessment(assessment: Assessment, studentId: ID, answers: Record<string, string>, extra: { fileName?: string; text?: string } = {}): Submission {
  const s = S();
  const { score, needsManual } = autoMark(assessment, answers);
  const late = new Date() > new Date(assessment.dueDate);
  const hasObjective = assessment.questions.some((q) => isAutoMarked(q.type));
  const autoGraded = hasObjective && !needsManual;
  const sub: Submission = {
    id: uid("smb"),
    assessmentId: assessment.id,
    studentId,
    submittedAt: new Date().toISOString(),
    answers,
    ...extra,
    score: autoGraded ? score : null,
    status: autoGraded ? "graded" : late ? "late" : "submitted",
    gradedAt: autoGraded ? new Date().toISOString() : undefined,
    feedback: autoGraded ? "Auto-marked." : undefined,
  };
  s.removeWhere("submissions", (x) => x.assessmentId === assessment.id && x.studentId === studentId);
  s.insert("submissions", sub);
  return sub;
}

export function gradeSubmission(submission: Submission, score: number, feedback: string) {
  const s = S();
  s.update("submissions", submission.id, { score, feedback, status: "graded", gradedAt: new Date().toISOString() });
  const a = s.assessments.find((x) => x.id === submission.assessmentId);
  const st = s.students.find((x) => x.id === submission.studentId);
  if (a && st) {
    s.notify({ userId: st.userId, schoolId: st.schoolId, kind: "graded", title: `${a.type === "quiz" ? "Quiz" : "Assignment"} graded`, body: `${a.title}: ${score}/${a.totalMarks}.`, href: "/student/grades" });
  }
}

/** Gradebook direct entry — creates a graded record when the student had no submission. */
export function setScore(assessment: Assessment, studentId: ID, score: number | null) {
  const s = S();
  const existing = s.submissions.find((x) => x.assessmentId === assessment.id && x.studentId === studentId);
  if (score === null) {
    if (existing) s.update("submissions", existing.id, { score: null, status: "submitted" });
    return;
  }
  if (existing) s.update("submissions", existing.id, { score, status: "graded", gradedAt: new Date().toISOString() });
  else s.insert("submissions", { id: uid("smb"), assessmentId: assessment.id, studentId, submittedAt: new Date().toISOString(), answers: {}, score, status: "graded", gradedAt: new Date().toISOString() });
}

// ------------------------------------------------------------------ live classroom (spec §33)

export function scheduleLive(course: Course, input: { title: string; scheduledAt: string; durationMinutes: number; waitingRoom: boolean }): LiveSession {
  const s = S();
  const live: LiveSession = { id: uid("live"), schoolId: course.schoolId, sessionId: course.sessionId, courseId: course.id, subjectId: course.subjectId, classId: course.classId, teacherId: course.teacherId, status: "scheduled", ...input };
  s.insert("liveSessions", live);
  notifyCourseStudents(course, { kind: "live_upcoming", title: "Upcoming live class", body: `${course.title}: ${input.title} — ${new Date(input.scheduledAt).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}.`, href: "/student/live" });
  s.audit({ schoolId: course.schoolId, action: "Live class scheduled", target: `${input.title} (${course.title})`, category: "live" });
  return live;
}

/**
 * Starts the class and tells every enrolled student: an in-app notification
 * (which the student's app also raises as a device notification) and, for
 * students with an email address who haven't turned it off, an email.
 */
export function startLive(liveId: ID): { notified: number; emailed: number } | undefined {
  const s = S();
  const live = s.liveSessions.find((l) => l.id === liveId);
  if (!live || live.status === "live") return;
  s.update("liveSessions", liveId, { status: "live", startedAt: new Date().toISOString() });
  const course = s.courses.find((c) => c.id === live.courseId);
  s.audit({ schoolId: live.schoolId, action: "Live class started", target: live.title, category: "live" });
  if (!course) return { notified: 0, emailed: 0 };
  const href = `/classroom/${liveId}/lobby`;
  notifyCourseStudents(course, { kind: "live_starting", title: "Live class starting", body: `${course.title}: ${live.title} has started. Join now.`, href });

  const studentIds = new Set(s.enrollments.filter((e) => e.classId === course.classId && e.subjectId === course.subjectId).map((e) => e.studentId));
  const users = s.students.filter((st) => studentIds.has(st.id)).map((st) => s.users.find((u) => u.id === st.userId)).filter((u): u is User => !!u && u.status !== "disabled");
  const teacher = s.teachers.find((t) => t.id === live.teacherId);
  const school = s.schools.find((x) => x.id === live.schoolId);
  const recipients = users.filter((u) => u.emailNotifications !== false && EMAIL_RE.test(u.email));
  const sentAt = new Date().toISOString();
  s.insertMany(
    "emails",
    recipients.map((u) => ({
      id: uid("eml"),
      userId: u.id,
      schoolId: live.schoolId,
      to: u.email,
      subject: `Live now: ${course.title} — ${live.title}`,
      body: `Hi ${u.name.split(" ")[0]},\n\n${teacher ? `${teacher.title} ${teacher.lastName}` : "Your teacher"} has started the live class "${live.title}" for ${course.title}${school ? ` at ${school.name}` : ""}.\n\nJoin now: ${href}\n\nYou're receiving this because email alerts are on. You can turn them off under Preferences.`,
      kind: "live_starting" as const,
      href,
      sentAt,
    })),
  );
  return { notified: users.length, emailed: recipients.length };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Ends the class and captures attendance from the participants who joined
 * (spec §40). The recording then enters "processing" (spec §34).
 */
export function endLive(liveId: ID, attendees: { studentId: ID; joinedAt: string; leftAt: string }[]): Recording | null {
  const s = S();
  const live = s.liveSessions.find((l) => l.id === liveId);
  if (!live) return null;
  const endedAt = new Date().toISOString();
  const startedAt = live.startedAt ?? endedAt;
  const durationSeconds = Math.max(60, Math.round((Date.parse(endedAt) - Date.parse(startedAt)) / 1000));
  const recordingId = uid("rec");
  const rec: Recording = { id: recordingId, schoolId: live.schoolId, sessionId: live.sessionId, liveSessionId: liveId, courseId: live.courseId, classId: live.classId, subjectId: live.subjectId, teacherId: live.teacherId, title: live.title, date: startedAt, durationSeconds, sizeMb: Math.max(12, Math.round(durationSeconds * 0.21)), status: "processing", views: 0, url: SAMPLE_VIDEO_URL };
  s.update("liveSessions", liveId, { status: "ended", endedAt, recordingId });
  s.insert("recordings", rec);

  const roster = s.placements.filter((p) => p.classId === live.classId);
  const byStudent = new Map(attendees.map((a) => [a.studentId, a]));
  const rows: AttendanceRecord[] = roster.map((p) => {
    const a = byStudent.get(p.studentId);
    if (!a) return { id: uid("att"), schoolId: live.schoolId, sessionId: live.sessionId, classId: live.classId, studentId: p.studentId, date: startedAt, kind: "live", liveSessionId: liveId, status: "absent" };
    const minutes = Math.max(1, Math.round((Date.parse(a.leftAt) - Date.parse(a.joinedAt)) / 60000));
    const late = Date.parse(a.joinedAt) - Date.parse(startedAt) > 10 * 60000;
    return { id: uid("att"), schoolId: live.schoolId, sessionId: live.sessionId, classId: live.classId, studentId: p.studentId, date: startedAt, kind: "live", liveSessionId: liveId, joinTime: a.joinedAt, leaveTime: a.leftAt, durationMinutes: minutes, segments: [{ joinTime: a.joinedAt, leaveTime: a.leftAt }], status: late ? "late" : "present" };
  });
  s.removeWhere("attendance", (x) => x.liveSessionId === liveId);
  s.insertMany("attendance", rows);
  s.audit({ schoolId: live.schoolId, action: "Live class ended", target: live.title, category: "live" });
  return rec;
}

/** Recording processing finished: mark ready, attach to the course, notify students (spec §33–34). */
export function finalizeRecording(recordingId: ID) {
  const s = S();
  const rec = s.recordings.find((r) => r.id === recordingId);
  if (!rec || rec.status === "ready") return;
  s.update("recordings", recordingId, { status: "ready" });
  const mod = s.modules.filter((m) => m.courseId === rec.courseId).sort((a, b) => b.order - a.order)[0];
  if (mod) {
    s.insert("contents", { id: uid("cnt"), moduleId: mod.id, courseId: rec.courseId, type: "recording", title: `Recording — ${rec.title}`, description: `Live class recorded ${new Date(rec.date).toDateString()}.`, refId: recordingId, url: rec.url, durationMinutes: Math.round(rec.durationSeconds / 60), order: 99, published: true, createdAt: new Date().toISOString() });
  }
  const course = s.courses.find((c) => c.id === rec.courseId);
  if (course) notifyCourseStudents(course, { kind: "recording", title: "Recording available", body: `${rec.title} (${course.title}) is ready to watch.`, href: `/recordings/${recordingId}` });
  s.audit({ schoolId: rec.schoolId, action: "Recording created", target: rec.title, category: "live" });
}
