"use client";

import { useMemo } from "react";
import { useSchoolData } from "@/lib/queries";
import { useMyTeacher } from "@/lib/session";

/** The current teacher's slice of the school data for the selected session. */
export function useTeacherData() {
  const d = useSchoolData();
  const teacher = useMyTeacher();
  return useMemo(() => {
    const courses = d.courses.filter((c) => c.teacherId === teacher?.id).sort((a, b) => a.title.localeCompare(b.title));
    const courseIds = new Set(courses.map((c) => c.id));
    const studentsOf = (courseId: string) => {
      const c = courses.find((x) => x.id === courseId);
      return c ? d.enrollments.filter((e) => e.classId === c.classId && e.subjectId === c.subjectId).map((e) => e.studentId) : [];
    };
    const myStudentIds = new Set(courses.flatMap((c) => studentsOf(c.id)));
    return {
      d,
      teacher,
      courses,
      studentsOf,
      students: d.allStudents.filter((s) => myStudentIds.has(s.id)),
      assessments: d.assessments.filter((a) => courseIds.has(a.courseId)),
      liveSessions: d.liveSessions.filter((l) => courseIds.has(l.courseId)),
      recordings: d.recordings.filter((r) => courseIds.has(r.courseId)),
      formClasses: d.classes.filter((c) => c.classTeacherId === teacher?.id),
    };
  }, [d, teacher]);
}
