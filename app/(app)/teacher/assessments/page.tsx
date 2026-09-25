"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { LinkButton } from "@/components/common/link-button";
import { AssessmentsTable } from "@/components/assessment/assessments-table";
import { SessionBanner } from "@/components/academic/session-banner";
import { useSchoolData } from "@/lib/queries";
import { useMyTeacher } from "@/lib/session";

export default function TeacherAssessmentsPage() {
  return (
    <Suspense>
      <List />
    </Suspense>
  );
}

function List() {
  const type = useSearchParams().get("type");
  const d = useSchoolData();
  const me = useMyTeacher();
  const router = useRouter();
  const rows = d.assessments.filter((a) => a.teacherId === me?.id && (!type || a.type === type));
  const title = type === "assignment" ? "Assignments" : type === "quiz" ? "Quizzes" : "Assessments";
  return (
    <>
      <PageHeader
        title={title}
        description={`Your ${title.toLowerCase()} for ${d.session.label}.`}
        actions={
          <LinkButton href={`/teacher/assessments/new${type ? `?type=${type}` : ""}`}>
            <Plus /> New {type ?? "assessment"}
          </LinkButton>
        }
      />
      <SessionBanner />
      <AssessmentsTable key={type ?? "all"} rows={rows} onRowClick={(a) => router.push(`/teacher/assessments/${a.id}`)} />
    </>
  );
}
