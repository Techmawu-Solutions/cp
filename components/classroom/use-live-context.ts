"use client";

import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { useCurrentUser } from "@/lib/session";
import type { ClassRole, RosterEntry } from "@/components/classroom/use-classroom";

/**
 * Resolves who the viewer is in a live class. Host = the course teacher;
 * student = registered for that class × subject; observer = a school admin of
 * the same school or the Super Admin. Everyone else is refused.
 */
export function useLiveContext(liveId: string) {
  const db = useStore();
  const me = useCurrentUser();
  return useMemo(() => {
    const live = db.liveSessions.find((l) => l.id === liveId);
    if (!live || !me) return { live: undefined, role: null as ClassRole | null } as const;
    const course = db.courses.find((c) => c.id === live.courseId)!;
    const teacher = db.teachers.find((t) => t.id === live.teacherId);
    const teacherUser = db.users.find((u) => u.id === teacher?.userId);
    const student = db.students.find((s) => s.userId === me.user.id && s.schoolId === live.schoolId);
    let role: ClassRole | null = null;
    if (teacherUser?.id === me.user.id) role = "host";
    else if (student && db.enrollments.some((e) => e.studentId === student.id && e.classId === live.classId && e.subjectId === live.subjectId)) role = "student";
    else if (me.portal === "super-admin" || (me.user.schoolId === live.schoolId && me.can("live_classes.view"))) role = "observer";

    const roster: RosterEntry[] = db.enrollments
      .filter((e) => e.classId === live.classId && e.subjectId === live.subjectId)
      .map((e) => db.students.find((s) => s.id === e.studentId)!)
      .filter(Boolean)
      .map((s) => ({ userId: s.userId, studentId: s.id, name: `${s.firstName} ${s.lastName}`, color: db.users.find((u) => u.id === s.userId)?.avatarColor ?? "#2563eb" }));

    // Content the (simulated) teacher presents to students: the next text lesson in the course.
    const lesson = db.contents.filter((c) => c.courseId === course.id && c.type === "text" && c.published).find((c) => c.title.toLowerCase().includes(live.title.toLowerCase().split(" ")[0] ?? "")) ?? db.contents.find((c) => c.courseId === course.id && c.type === "text" && c.published);

    return {
      live,
      course,
      role,
      me,
      student,
      roster,
      subject: db.subjects.find((s) => s.id === live.subjectId),
      cls: db.classes.find((c) => c.id === live.classId),
      teacher,
      host: { userId: teacherUser?.id ?? "host", name: teacher ? `${teacher.title} ${teacher.firstName} ${teacher.lastName}` : "Teacher", color: teacherUser?.avatarColor ?? "#4f46e5" },
      lesson,
      back: me.portal === "teacher" ? `/teacher/courses/${course.id}?tab=live` : me.portal === "student" ? `/learn/${course.id}` : me.portal === "school" || db.actingSchoolId ? "/school/live-classes" : "/super-admin/live",
    } as const;
  }, [db, me, liveId]);
}
