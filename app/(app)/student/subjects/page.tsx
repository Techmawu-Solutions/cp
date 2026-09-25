"use client";

import { PageHeader } from "@/components/common/page-header";
import { SessionBanner } from "@/components/academic/session-banner";
import { StudentCourseGrid } from "@/components/course/student-course-grid";
import { useSchoolData } from "@/lib/queries";

export default function StudentSubjectsPage() {
  const d = useSchoolData();
  return (
    <>
      <PageHeader title="My Subjects" description={`Subjects you're registered for in ${d.session.label}.`} />
      <SessionBanner />
      <StudentCourseGrid />
    </>
  );
}
