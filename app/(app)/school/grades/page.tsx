"use client";

import { useState } from "react";
import { PageHeader } from "@/components/common/page-header";
import { AppSelect } from "@/components/common/app-select";
import { EmptyState } from "@/components/common/empty-state";
import { Gradebook } from "@/components/assessment/gradebook";
import { SessionBanner, useSessionEditable } from "@/components/academic/session-banner";
import { RequirePermission } from "@/components/layout/app-shell";
import { useSchoolData } from "@/lib/queries";
import { useCurrentUser } from "@/lib/session";

export default function SchoolGradesPage() {
  const d = useSchoolData();
  const me = useCurrentUser();
  const editable = useSessionEditable();
  const [classId, setClassId] = useState("");
  const [courseId, setCourseId] = useState("");
  const cls = d.byId.class.get(classId) ?? d.classes[0];
  const courses = d.courses.filter((c) => c.classId === cls?.id).sort((a, b) => a.title.localeCompare(b.title));
  const course = courses.find((c) => c.id === courseId) ?? courses[0];

  return (
    <RequirePermission perm={["assessments.grade", "assessments.export"]}>
      <PageHeader title="Grades" description={`Gradebooks for every class and subject in ${d.session.label}. Grades keep their academic-session context.`} />
      <SessionBanner />
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <AppSelect className="sm:w-48" value={cls?.id} onChange={(v) => (setClassId(v), setCourseId(""))} options={d.classes.map((c) => ({ value: c.id, label: c.name }))} placeholder="Class" />
        <AppSelect className="sm:w-72" value={course?.id} onChange={setCourseId} options={courses.map((c) => ({ value: c.id, label: d.byId.subject.get(c.subjectId)?.name ?? c.title }))} placeholder="Subject" />
      </div>
      {course ? <Gradebook key={course.id} course={course} data={d} editable={editable && !!me?.can("assessments.grade")} /> : <EmptyState title="No courses for this class" />}
    </RequirePermission>
  );
}
