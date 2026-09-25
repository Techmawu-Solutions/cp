"use client";

import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { uid } from "@/lib/helpers";
import { AVATAR_COLORS } from "@/lib/helpers";
import { assignTeacher, enroll } from "@/lib/actions";
import type { DB } from "@/lib/data/seed";
import type { Gender, ID, PaymentMethod, School, Student, VacationRegistration } from "@/lib/types";

/**
 * Vacation Classes (spec §49.1): pricing, bundles, paid registration and
 * teacher matching. The vacation workspace is an ordinary tenant, so once a
 * student is paid and enrolled every LMS feature works unchanged.
 */

const S = () => useStore.getState();

export const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  momo_mtn: "MTN Mobile Money",
  momo_telecel: "Telecel Cash",
  momo_airteltigo: "AirtelTigo Money",
  card: "Debit / credit card",
  cash: "Cash (recorded by coordinator)",
};

export const fmtGhs = (n: number) => `GHS ${new Intl.NumberFormat("en-GH", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n)}`;

export function vacationSchool(db: Pick<DB, "schools">): School | undefined {
  return db.schools.find((s) => s.kind === "vacation");
}

/** Everything the landing page and registration flow need about the open vacation session. */
export function useVacationCatalogue(preferSessionId?: string) {
  const db = useStore();
  return useMemo(() => {
    const school = vacationSchool(db);
    const sessions = db.academicSessions.filter((s) => s.schoolId === school?.id && s.status !== "closed").sort((a, b) => a.startDate.localeCompare(b.startDate));
    const session = sessions.find((s) => s.id === preferSessionId) ?? sessions.find((s) => db.vacationBundles.some((b) => b.sessionId === s.id)) ?? sessions[0];
    const classes = db.classes.filter((c) => c.sessionId === session?.id).sort((a, b) => a.name.localeCompare(b.name));
    const subjects = db.subjects.filter((x) => x.sessionId === session?.id);
    const prices = db.vacationPrices.filter((p) => p.sessionId === session?.id);
    const bundles = db.vacationBundles.filter((b) => b.sessionId === session?.id && b.active);
    const priceOf = (subjectId: ID) => prices.find((p) => p.subjectId === subjectId)?.fee ?? 0;
    const subjectsFor = (classId: ID) => subjects.filter((x) => prices.some((p) => p.subjectId === x.id && (p.classIds.length === 0 || p.classIds.includes(classId))));
    const bundlesFor = (classId: ID) => bundles.filter((b) => b.classIds.length === 0 || b.classIds.includes(classId));
    return { school, session, sessions, classes, subjects, prices, bundles, priceOf, subjectsFor, bundlesFor, teachers: db.teachers.filter((t) => t.schoolId === school?.id) };
  }, [db, preferSessionId]);
}

export function quote(db: Pick<DB, "vacationBundles" | "vacationPrices">, pick: { bundleId?: ID; subjectIds: ID[] }) {
  const bundle = db.vacationBundles.find((b) => b.id === pick.bundleId);
  const fees = (ids: ID[]) => ids.reduce((a, id) => a + (db.vacationPrices.find((p) => p.subjectId === id)?.fee ?? 0), 0);
  if (bundle) {
    const full = fees(bundle.subjectIds);
    return { total: bundle.price, full, saving: Math.max(0, full - bundle.price), subjectIds: bundle.subjectIds };
  }
  const total = fees(pick.subjectIds);
  return { total, full: total, saving: 0, subjectIds: pick.subjectIds };
}

/** The student's home record (from their school) used to prefill registration for existing users. */
export function homeProfile(db: DB, userId: ID) {
  const user = db.users.find((u) => u.id === userId);
  const student = db.students.find((s) => s.userId === userId && s.schoolId === user?.schoolId) ?? db.students.find((s) => s.userId === userId);
  const school = db.schools.find((s) => s.id === user?.schoolId);
  const cls = student ? db.classes.find((c) => c.id === db.placements.find((p) => p.studentId === student.id && db.academicSessions.find((x) => x.id === p.sessionId)?.status === "active")?.classId) : undefined;
  return { user, student, school, className: cls?.name, level: cls?.level };
}

export interface NewStudentInput {
  firstName: string;
  lastName: string;
  gender: Gender;
  email: string;
  phone: string;
  dateOfBirth: string;
  currentSchool: string;
  guardianName: string;
  guardianPhone: string;
  password: string;
}

/** Creates (or reuses) the account and vacation student record, and a registration awaiting payment. */
export function startRegistration(input: { sessionId: ID; classId: ID; bundleId?: ID; subjectIds: ID[]; existingUserId?: ID; newStudent?: NewStudentInput }): VacationRegistration {
  const s = S();
  const school = vacationSchool(s)!;
  let userId = input.existingUserId;
  let source: VacationRegistration["source"] = "existing";
  let homeSchoolId: ID | undefined;
  let homeSchoolName: string | undefined;
  if (!userId && input.newStudent) {
    const n = input.newStudent;
    userId = uid("usr");
    source = "new";
    homeSchoolName = n.currentSchool || undefined;
    s.insert("users", { id: userId, name: `${n.firstName} ${n.lastName}`, email: n.email.trim(), phone: n.phone, roleId: "role_student", schoolId: school.id, status: "active", avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]! });
    s.setPassword(userId, n.password);
  } else if (userId) {
    const home = homeProfile(s, userId);
    homeSchoolId = home.school?.kind === "vacation" ? undefined : home.school?.id;
    homeSchoolName = home.school?.kind === "vacation" ? undefined : home.school?.name;
  }
  const user = S().users.find((u) => u.id === userId)!;
  // One vacation student record per person, reused across vacation sessions.
  let student: Student | undefined = S().students.find((x) => x.userId === userId && x.schoolId === school.id);
  if (!student) {
    const home = homeProfile(S(), userId!);
    const n = input.newStudent;
    const count = S().students.filter((x) => x.schoolId === school.id).length + 1;
    student = {
      id: uid("stu"),
      userId: userId!,
      schoolId: school.id,
      studentNumber: `EVC/${new Date().getFullYear().toString().slice(2)}/${String(count).padStart(4, "0")}`,
      firstName: n?.firstName ?? home.student?.firstName ?? user.name.split(" ")[0]!,
      lastName: n?.lastName ?? home.student?.lastName ?? user.name.split(" ").slice(1).join(" "),
      gender: n?.gender ?? home.student?.gender ?? "F",
      dateOfBirth: n?.dateOfBirth ?? home.student?.dateOfBirth ?? "",
      guardianName: n?.guardianName ?? home.student?.guardianName ?? "",
      guardianPhone: n?.guardianPhone ?? home.student?.guardianPhone ?? "",
      status: "active",
      createdAt: new Date().toISOString(),
    };
    S().insert("students", student);
  }
  const q = quote(S(), { bundleId: input.bundleId, subjectIds: input.subjectIds });
  const reg: VacationRegistration = { id: uid("vreg"), sessionId: input.sessionId, userId: userId!, studentId: student.id, classId: input.classId, bundleId: input.bundleId, subjectIds: q.subjectIds, amount: q.total, status: "awaiting_payment", source, homeSchoolId, homeSchoolName, createdAt: new Date().toISOString() };
  S().insert("vacationRegistrations", reg);
  S().audit({ schoolId: school.id, action: "Vacation registration started", target: `${user.name} · ${fmtGhs(q.total)}`, category: "user" });
  return reg;
}

/** Payment confirmed: place the student, enrol them in their subjects, notify. */
export function confirmPayment(regId: ID, payment: { method: PaymentMethod; phone?: string; last4?: string }) {
  const s = S();
  const reg = s.vacationRegistrations.find((r) => r.id === regId);
  if (!reg || reg.status === "paid") return reg;
  const school = vacationSchool(s)!;
  const paidAt = new Date().toISOString();
  const reference = `EVC${Date.now().toString(36).toUpperCase().slice(-7)}`;
  s.update("vacationRegistrations", regId, { status: "paid", payment: { ...payment, reference, paidAt } });
  // Placement: keep an existing placement in this session, otherwise place in the chosen class.
  if (!s.placements.some((p) => p.studentId === reg.studentId && p.sessionId === reg.sessionId)) {
    s.insert("placements", { id: uid("plc"), schoolId: school.id, sessionId: reg.sessionId, studentId: reg.studentId, classId: reg.classId });
  }
  enroll(school.id, reg.sessionId, reg.classId, [reg.studentId], reg.subjectIds, true);
  const user = S().users.find((u) => u.id === reg.userId);
  S().notify({ userId: reg.userId, schoolId: null, kind: "system", title: "Vacation Classes: payment received", body: `${fmtGhs(reg.amount)} received (ref ${reference}). You're enrolled in ${reg.subjectIds.length} subjects.`, href: "/student/dashboard" });
  for (const admin of S().users.filter((u) => u.schoolId === school.id && u.roleId === "role_school_admin")) {
    S().notify({ userId: admin.id, schoolId: school.id, kind: "system", title: "New paid registration", body: `${user?.name} paid ${fmtGhs(reg.amount)} (${PAYMENT_LABEL[payment.method]}).`, href: "/school/vacation/registrations" });
  }
  S().audit({ schoolId: school.id, action: "Vacation payment received", target: `${user?.name} · ${fmtGhs(reg.amount)} · ${reference}`, category: "user" });
  return S().vacationRegistrations.find((r) => r.id === regId);
}

export function cancelRegistration(regId: ID) {
  const s = S();
  const reg = s.vacationRegistrations.find((r) => r.id === regId);
  if (!reg || reg.status !== "awaiting_payment") return;
  s.update("vacationRegistrations", regId, { status: "cancelled" });
  s.audit({ schoolId: vacationSchool(s)?.id ?? null, action: "Vacation registration cancelled", target: s.users.find((u) => u.id === reg.userId)?.name ?? regId, category: "user" });
}

/** Links a teacher from any school into the vacation workspace under the same account. */
export function linkExistingTeacher(userId: ID) {
  const s = S();
  const school = vacationSchool(s)!;
  if (s.teachers.some((t) => t.userId === userId && t.schoolId === school.id)) return;
  const home = s.teachers.find((t) => t.userId === userId);
  if (!home) return;
  const count = s.teachers.filter((t) => t.schoolId === school.id).length + 1;
  s.insert("teachers", { ...home, id: uid("tch"), schoolId: school.id, staffNumber: `EVC/T/${String(count).padStart(3, "0")}`, status: "active" });
  s.audit({ schoolId: school.id, action: "Teacher linked to Vacation Classes", target: `${home.title} ${home.firstName} ${home.lastName}`, category: "user" });
  s.notify({ userId, schoolId: null, kind: "system", title: "Added to Vacation Classes", body: "You can now teach in Vacation Classes. Switch workspace from the top bar.", href: "/teacher/dashboard" });
}

/** Teachers ranked for a subject: specialisation match first, then lightest load. */
export function rankTeachers(db: DB, schoolId: ID, sessionId: ID, subjectName: string, subjectCode: string) {
  const load = (tid: ID) => db.teachingAssignments.filter((t) => t.teacherId === tid && t.sessionId === sessionId).length;
  return db.teachers
    .filter((t) => t.schoolId === schoolId && t.status === "active")
    .map((t) => {
      const spec = t.specialization.toLowerCase();
      const match = spec.includes(subjectName.toLowerCase()) || spec.split(/,\s*/).some((x) => x === subjectCode.toLowerCase() || subjectName.toLowerCase().includes(x));
      return { teacher: t, match, load: load(t.id) };
    })
    .sort((a, b) => Number(b.match) - Number(a.match) || a.load - b.load);
}

/** Assigns the best-ranked matching teacher to every unassigned subject × class with students. */
export function autoMatch(schoolId: ID, sessionId: ID): number {
  const s = S();
  const pairs = new Set(s.enrollments.filter((e) => e.schoolId === schoolId && e.sessionId === sessionId).map((e) => `${e.classId}:${e.subjectId}`));
  let matched = 0;
  for (const pair of pairs) {
    const [classId, subjectId] = pair.split(":") as [ID, ID];
    if (S().teachingAssignments.some((t) => t.sessionId === sessionId && t.classId === classId && t.subjectId === subjectId)) continue;
    const subject = S().subjects.find((x) => x.id === subjectId);
    if (!subject) continue;
    const best = rankTeachers(S(), schoolId, sessionId, subject.name, subject.code).find((x) => x.match);
    if (!best) continue;
    const already = S().teachingAssignments.filter((t) => t.sessionId === sessionId && t.subjectId === subjectId && t.teacherId === best.teacher.id).map((t) => t.classId);
    assignTeacher(schoolId, sessionId, subjectId, best.teacher.id, [...already, classId]);
    matched++;
  }
  return matched;
}
