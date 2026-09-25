"use client";

import { useParams } from "next/navigation";
import { RequirePermission } from "@/components/layout/app-shell";
import { AssessmentDetail } from "@/components/assessment/assessment-detail";

export default function SchoolAssessmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <RequirePermission perm="assessments.view">
      <AssessmentDetail id={id} base="/school" />
    </RequirePermission>
  );
}
