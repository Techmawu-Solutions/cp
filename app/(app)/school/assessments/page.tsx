"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/common/page-header";
import { AssessmentsTable } from "@/components/assessment/assessments-table";
import { SessionBanner } from "@/components/academic/session-banner";
import { RequirePermission } from "@/components/layout/app-shell";
import { useSchoolData } from "@/lib/queries";

export default function SchoolAssessmentsPage() {
  const d = useSchoolData();
  const router = useRouter();
  return (
    <RequirePermission perm="assessments.view">
      <PageHeader title="Assessments" description={`All assignments, quizzes, tests and exams in ${d.session.label}.`} breadcrumbs={[{ label: "Assessments" }]} />
      <SessionBanner />
      <AssessmentsTable rows={d.assessments} onRowClick={(a) => router.push(`/school/assessments/${a.id}`)} />
    </RequirePermission>
  );
}
