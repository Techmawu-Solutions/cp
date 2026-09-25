"use client";

import { useState } from "react";
import { PageHeader } from "@/components/common/page-header";
import { AppSelect } from "@/components/common/app-select";
import { EmptyState } from "@/components/common/empty-state";
import { Gradebook } from "@/components/assessment/gradebook";
import { SessionBanner, useSessionEditable } from "@/components/academic/session-banner";
import { useTeacherData } from "@/lib/teacher";

/** Gradebook (spec §38). */
export default function TeacherGradesPage() {
  const t = useTeacherData();
  const editable = useSessionEditable();
  const [courseId, setCourseId] = useState("");
  const course = t.courses.find((c) => c.id === courseId) ?? t.courses[0];
  return (
    <>
      <PageHeader title="Gradebook" description="Scores for every assessment. Export to Excel or CSV, or print." />
      <SessionBanner />
      {!course ? (
        <EmptyState title="No courses assigned" />
      ) : (
        <>
          <AppSelect className="mb-4 sm:w-80" value={course.id} onChange={setCourseId} options={t.courses.map((c) => ({ value: c.id, label: c.title }))} />
          <Gradebook key={course.id} course={course} data={t.d} editable={editable} />
        </>
      )}
    </>
  );
}
