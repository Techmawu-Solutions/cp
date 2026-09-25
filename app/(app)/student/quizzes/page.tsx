"use client";

import { PageHeader } from "@/components/common/page-header";
import { SessionBanner } from "@/components/academic/session-banner";
import { StudentWorkList } from "@/components/assessment/student-work-list";
import { useStudentData } from "@/lib/student";

export default function StudentQuizzesPage() {
  const s = useStudentData();
  return (
    <>
      <PageHeader title="Quizzes" description="Timed quizzes are marked automatically when you submit." />
      <SessionBanner />
      <StudentWorkList assessments={s.assessments.filter((a) => a.type === "quiz")} />
    </>
  );
}
