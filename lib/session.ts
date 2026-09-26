"use client";

import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { useNow } from "@/lib/use-now";
import type { AcademicSession, ID, Role, School, Student, Teacher, User } from "@/lib/types";

export type Portal = "super-admin" | "school" | "teacher" | "student";

export const PORTAL_HOME: Record<Portal, string> = {
  "super-admin": "/super-admin/dashboard",
  school: "/school/dashboard",
  teacher: "/teacher/dashboard",
  student: "/student/dashboard",
};

/** Built-in roles map to their portal; custom roles fall back on scope (spec §9). */
export function portalFor(roles: Role[]): Portal {
  const keys = roles.map((r) => r.key);
  if (keys.includes("super_admin")) return "super-admin";
  if (keys.includes("school_admin")) return "school";
  if (keys.includes("teacher")) return "teacher";
  if (keys.includes("student")) return "student";
  return roles.some((r) => r.scope === "platform") ? "super-admin" : "school";
}

export interface CurrentUser {
  user: User;
  roles: Role[];
  permissions: Set<string>;
  portal: Portal;
  can: (perm: string | string[]) => boolean;
}

export function useCurrentUser(): CurrentUser | null {
  const userId = useStore((s) => s.userId);
  const users = useStore((s) => s.users);
  const roles = useStore((s) => s.roles);
  return useMemo(() => {
    const user = users.find((u) => u.id === userId);
    if (!user) return null;
    const userRoles = roles.filter((r) => user.roleId === r.id);
    const permissions = new Set(userRoles.flatMap((r) => r.permissions));
    return {
      user,
      roles: userRoles,
      permissions,
      portal: portalFor(userRoles),
      can: (perm) => (Array.isArray(perm) ? perm.some((p) => permissions.has(p)) : permissions.has(perm)),
    };
  }, [userId, users, roles]);
}

/**
 * The tenant the current user is working in. School users are pinned to their
 * own school; the Super Admin only has a tenant while "entered" into one.
 */
export function useTenant(): { schoolId: ID | null; school: School | null; isImpersonating: boolean; workspaces: School[] } {
  const me = useCurrentUser();
  const actingSchoolId = useStore((s) => s.actingSchoolId);
  const workspaceSchoolId = useStore((s) => s.workspaceSchoolId);
  const schools = useStore((s) => s.schools);
  const students = useStore((s) => s.students);
  const teachers = useStore((s) => s.teachers);
  return useMemo(() => {
    // A user's workspaces: their home school plus any tenant (e.g. Vacation
    // Classes) where they also have a student or teacher record.
    const ids = new Set<ID>();
    if (me?.user.schoolId) ids.add(me.user.schoolId);
    if (me) {
      students.filter((s) => s.userId === me.user.id).forEach((s) => ids.add(s.schoolId));
      teachers.filter((t) => t.userId === me.user.id).forEach((t) => ids.add(t.schoolId));
    }
    const workspaces = schools.filter((s) => ids.has(s.id));
    const home = me?.user.schoolId ?? (me?.portal === "super-admin" ? actingSchoolId : null);
    const schoolId = workspaceSchoolId && ids.has(workspaceSchoolId) ? workspaceSchoolId : home;
    return {
      schoolId,
      school: schools.find((s) => s.id === schoolId) ?? null,
      isImpersonating: !me?.user.schoolId && !!actingSchoolId,
      workspaces,
    };
  }, [me, actingSchoolId, workspaceSchoolId, schools, students, teachers]);
}

export function sessionLabel(session: AcademicSession | undefined, years: { id: ID; name: string }[]): string {
  if (!session) return "No session";
  const year = years.find((y) => y.id === session.academicYearId);
  return `${year?.name ?? ""} — ${session.name}`;
}

/** Sessions for a school plus the one selected in the header (spec §6.5). */
export function useAcademicSession(schoolId: ID | null) {
  const sessions = useStore((s) => s.academicSessions);
  const years = useStore((s) => s.academicYears);
  const selected = useStore((s) => (schoolId ? s.sessionBySchool[schoolId] : undefined));
  const me = useCurrentUser();
  const now = useNow(60_000);
  const isStudent = me?.portal === "student";
  return useMemo(() => {
    const mine = sessions
      .filter((x) => x.schoolId === schoolId)
      // Students lose a closed vacation batch once its access period ends (spec §49.1.7); staff keep every record.
      .filter((x) => !isStudent || !x.batch?.closeout?.accessUntil || Date.parse(x.batch.closeout.accessUntil) >= now)
      .sort((a, b) => b.startDate.localeCompare(a.startDate));
    const active = mine.find((x) => x.status === "active");
    const current = mine.find((x) => x.id === selected) ?? active ?? mine[0];
    const myYears = years.filter((y) => y.schoolId === schoolId).sort((a, b) => b.name.localeCompare(a.name));
    return {
      sessions: mine,
      years: myYears,
      active,
      current,
      sessionId: current?.id ?? null,
      label: sessionLabel(current, myYears),
      isActive: !!current && current.id === active?.id,
    };
  }, [sessions, years, schoolId, selected, isStudent, now]);
}

/** schoolId + sessionId for the screen being rendered — the tenancy + session scope. */
export function useScope() {
  const { schoolId, school } = useTenant();
  const session = useAcademicSession(schoolId);
  return { schoolId, school, sessionId: session.sessionId, session };
}

/** The signed-in user's teacher record in the current workspace. */
export function useMyTeacher(): Teacher | null {
  const me = useCurrentUser();
  const { schoolId } = useTenant();
  const teachers = useStore((s) => s.teachers);
  return useMemo(() => teachers.find((t) => t.userId === me?.user.id && t.schoolId === schoolId) ?? null, [teachers, me, schoolId]);
}

/** The signed-in user's student record in the current workspace. */
export function useMyStudent(): Student | null {
  const me = useCurrentUser();
  const { schoolId } = useTenant();
  const students = useStore((s) => s.students);
  return useMemo(() => students.find((t) => t.userId === me?.user.id && t.schoolId === schoolId) ?? null, [students, me, schoolId]);
}

export const teacherName = (t: Teacher | undefined | null) => (t ? `${t.title} ${t.firstName} ${t.lastName}` : "Unassigned");
export const studentName = (s: Student | undefined | null) => (s ? `${s.firstName} ${s.lastName}` : "Unknown");
