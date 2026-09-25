"use client";

import { PageHeader } from "@/components/common/page-header";
import { SessionBanner } from "@/components/academic/session-banner";
import { StudentWorkList } from "@/components/assessment/student-work-list";
import { useStudentData } from "@/lib/student";

export default function StudentAssignmentsPage() {
  const s = useStudentData();
  const rows = s.assessments.filter((a) => a.type !== "quiz");
  const todo = rows.filter((a) => ["todo", "overdue"].includes(s.stateOf(a))).length;
  return (
    <>
      <PageHeader title="Assignments" description={`${todo} to do · assignments, tests, projects and exams across your subjects.`} />
      <SessionBanner />
      <StudentWorkList assessments={rows} />
    </>
  );
}
